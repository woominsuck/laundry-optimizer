/* =====================================================================
   세탁물 분류 · 세탁 순서 최적화 플랫폼

   [메인 기능] 충돌 제약을 지키는 최소 세탁 회차 분할 + 세탁 순서 최적화
   [서브 기능] 옷 등록·관리(DB) / 세탁 기호 자동 변환 / 충돌 그래프 분석 /
               관행 대비 비교 / 간트 차트 / 실험 이력과 변화 그래프

   로드 순서: supabase-js → supabase-config.js → data.js → app.js
   ===================================================================== */

/* ---------- 상태 ---------- */
let clothes  = [];      // 화면에 보이는 옷 목록
let capacity = 10;      // 세탁기 용량(kg)
let db       = null;    // Supabase 클라이언트 (연결 실패 시 null)

const statusEl = document.getElementById('db-status');

function setStatus(text, kind) {
  statusEl.textContent = text;
  statusEl.className = 'db-status ' + (kind || '');
}


/* =====================================================================
   1. 세탁 기호 선택 칸 채우기
   ===================================================================== */
function fillSelect(selectEl, options) {
  options.forEach(function (o) {
    const el = document.createElement('option');
    el.value = o.code;
    el.textContent = o.label;
    selectEl.appendChild(el);
  });
}

const washSelect = document.getElementById('wash-code');
const spinSelect = document.getElementById('spin-code');
const drySelect  = document.getElementById('dry-code');

fillSelect(washSelect, WASH_OPTIONS);
fillSelect(spinSelect, SPIN_OPTIONS);
fillSelect(drySelect,  DRY_OPTIONS);


/* =====================================================================
   2. 기호를 고르면 허용 최고 온도·탈수·건조 자동 표시
   ===================================================================== */
const infoEl = document.getElementById('symbol-info');

function showSymbolInfo() {
  const w = WASH_BY_CODE[washSelect.value];
  const s = WASH_BY_CODE[spinSelect.value];
  const d = WASH_BY_CODE[drySelect.value];
  const temp = (w.max_temp_c === null) ? '물세탁 불가' : w.max_temp_c + '도';
  infoEl.textContent = '허용 최고 온도 ' + temp + '  /  탈수 ' + s.spin_level + '  /  건조 ' + d.dry_method;
}
washSelect.addEventListener('change', showSymbolInfo);
spinSelect.addEventListener('change', showSymbolInfo);
drySelect.addEventListener('change', showSymbolInfo);


/* =====================================================================
   3. 데이터베이스 (Supabase)
   연결이 안 되면 null 로 두고 브라우저 메모리만 쓴다. 화면은 그대로 동작한다.
   ===================================================================== */
function connectDB() {
  try {
    if (!window.supabase || typeof SUPABASE_URL === 'undefined') return null;
    return window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  } catch (e) {
    console.warn('Supabase 연결 실패:', e);
    return null;
  }
}

async function dbLoadClothes() {
  const res = await db.from('clothes').select('*').order('id', { ascending: true });
  if (res.error) throw res.error;
  return res.data;
}

async function dbInsertClothes(rows) {
  const res = await db.from('clothes').insert(rows);
  if (res.error) throw res.error;
}

async function dbDeleteCloth(id) {
  const res = await db.from('clothes').delete().eq('id', id);
  if (res.error) throw res.error;
}

async function dbDeleteAllClothes() {
  const res = await db.from('clothes').delete().gte('id', 0);
  if (res.error) throw res.error;
}

async function dbLoadCapacity() {
  const res = await db.from('machine_settings')
    .select('*').order('id', { ascending: false }).limit(1);
  if (res.error) throw res.error;
  return (res.data && res.data.length) ? Number(res.data[0].capacity_kg) : null;
}

async function dbSaveCapacity(kg) {
  const res = await db.from('machine_settings').insert({ capacity_kg: kg });
  if (res.error) throw res.error;
}

async function dbSaveRun(row) {
  const res = await db.from('runs').insert(row);
  if (res.error) throw res.error;
}

async function dbLoadRuns() {
  const res = await db.from('runs')
    .select('*').order('id', { ascending: true }).limit(20);
  if (res.error) throw res.error;
  return res.data;
}

// 표본 데이터를 DB 에 넣을 모양으로 바꾼다 (id 는 DB 가 만든다)
function toRow(c) {
  return {
    item: c.item, material: c.material,
    color_family: c.color_family, color_depth: c.color_depth,
    weight_g: c.weight_g, soil_level: c.soil_level, is_new: c.is_new,
    wash_code: c.wash_code, spin_code: c.spin_code, dry_code: c.dry_code
  };
}


/* =====================================================================
   4. 등록 목록 그리기
   ===================================================================== */
function render() {
  const tbody = document.querySelector('#clothes-table tbody');
  tbody.innerHTML = '';

  clothes.forEach(function (c, i) {
    const w = WASH_BY_CODE[c.wash_code];
    const s = WASH_BY_CODE[c.spin_code];
    const d = WASH_BY_CODE[c.dry_code];
    const temp = (w.max_temp_c === null) ? '불가' : w.max_temp_c + '도';
    const color = c.color_family + '(' + c.color_depth + ')' + (c.is_new ? ' 새옷' : '');

    const tr = document.createElement('tr');
    tr.innerHTML =
      '<td>' + (i + 1) + '</td>' +
      '<td>' + c.item + '</td>' +
      '<td>' + c.material + '</td>' +
      '<td>' + color + '</td>' +
      '<td class="num">' + c.weight_g + 'g</td>' +
      '<td class="num">' + c.soil_level + '</td>' +
      '<td class="num">' + temp + '</td>' +
      '<td>' + s.spin_level + '</td>' +
      '<td>' + d.dry_method + '</td>' +
      '<td><button type="button" class="del" data-id="' + c.id + '">삭제</button></td>';
    tbody.appendChild(tr);
  });

  const totalKg = clothes.reduce(function (s, c) { return s + c.weight_g; }, 0) / 1000;
  document.getElementById('count').textContent =
    clothes.length + '벌 · 합계 ' + totalKg.toFixed(1) + 'kg';
}

// 삭제 버튼 (목록이 다시 그려져도 동작하도록 표 전체에 한 번만 건다)
document.querySelector('#clothes-table').addEventListener('click', async function (e) {
  if (!e.target.classList.contains('del')) return;
  const id = e.target.getAttribute('data-id');
  if (db) {
    try { await dbDeleteCloth(Number(id)); await reloadClothes(); }
    catch (err) { alert('삭제 실패: ' + err.message); }
  } else {
    clothes = clothes.filter(function (c) { return String(c.id) !== String(id); });
    render();
  }
});


/* =====================================================================
   5. 등록 / 표본 넣기 / 전체 비우기
   ===================================================================== */
function formToCloth() {
  return {
    item:         document.getElementById('item').value,
    material:     document.getElementById('material').value,
    color_family: document.getElementById('color-family').value,
    color_depth:  document.getElementById('color-depth').value,
    weight_g:     Number(document.getElementById('weight').value),
    soil_level:   Number(document.getElementById('soil').value),
    is_new:       document.getElementById('is-new').checked,
    wash_code:    washSelect.value,
    spin_code:    spinSelect.value,
    dry_code:     drySelect.value
  };
}

document.getElementById('clothes-form').addEventListener('submit', async function (e) {
  e.preventDefault();
  const c = formToCloth();

  if (db) {
    try { await dbInsertClothes([c]); await reloadClothes(); }
    catch (err) { alert('저장 실패: ' + err.message); return; }
  } else {
    c.id = 'L' + (clothes.length + 1);
    clothes.push(c);
    render();
  }

  document.getElementById('item').value = '';
  document.getElementById('item').focus();
});

document.getElementById('seed-sample').addEventListener('click', async function () {
  if (db) {
    try {
      await dbInsertClothes(CLOTHES_SAMPLE.map(toRow));
      await reloadClothes();
    } catch (err) { alert('표본 넣기 실패: ' + err.message); }
  } else {
    clothes = CLOTHES_SAMPLE.slice();
    render();
  }
});

document.getElementById('clear-all').addEventListener('click', async function () {
  if (!confirm('등록된 옷을 전부 지웁니다. 계속할까요?')) return;
  if (db) {
    try { await dbDeleteAllClothes(); await reloadClothes(); }
    catch (err) { alert('삭제 실패: ' + err.message); }
  } else {
    clothes = [];
    render();
  }
});

async function reloadClothes() {
  clothes = await dbLoadClothes();
  render();
}


/* =====================================================================
   6. 세탁기 용량 — 바꾸면 DB 에 저장
   ===================================================================== */
const capEl = document.getElementById('capacity');

capEl.addEventListener('change', async function () {
  capacity = Number(capEl.value);
  if (!db) return;
  try { await dbSaveCapacity(capacity); setStatus('데이터베이스 연결됨 — 용량 저장함', 'ok'); }
  catch (err) { console.warn('용량 저장 실패', err); }
});


/* =====================================================================
   7. 충돌 판정
     (1) 이염 위험        : 진한 색 + (새 옷이거나 빨강) 과 연한 색이 만날 때
     (2) 온도 구간 불일치 : 허용 최고 온도 차이가 30도 이상일 때
     (3) 섬유 손상 위험   : 탈수 금지 옷과 일반 탈수 옷이 섞일 때
   ===================================================================== */
function bleedRisk(a, b) {
  return (a.color_depth === '진함')
      && (a.is_new === true || a.color_family === '빨강')
      && (b.color_depth === '연함');
}

function conflictReason(a, b) {
  if (bleedRisk(a, b) || bleedRisk(b, a)) return '이염 위험';
  const tempA = WASH_BY_CODE[a.wash_code].max_temp_c;
  const tempB = WASH_BY_CODE[b.wash_code].max_temp_c;
  if (Math.abs(tempA - tempB) >= 30) return '온도 구간 불일치';
  if ((a.spin_code === 'SPIN_NO') !== (b.spin_code === 'SPIN_NO')) return '섬유 손상 위험';
  return null;
}

function buildConflictGraph(list) {
  const excluded = list.filter(function (c) { return c.wash_code === 'NO_WASH'; });
  const nodes    = list.filter(function (c) { return c.wash_code !== 'NO_WASH'; });
  const edges = [];
  for (let i = 0; i < nodes.length; i++)
    for (let j = i + 1; j < nodes.length; j++) {
      const r = conflictReason(nodes[i], nodes[j]);
      if (r !== null) edges.push({ a: nodes[i], b: nodes[j], reason: r });
    }
  return { nodes: nodes, edges: edges, excluded: excluded };
}

document.getElementById('build-graph').addEventListener('click', function () {
  const g = buildConflictGraph(clothes);
  const n = g.nodes.length;
  const maxEdges = n * (n - 1) / 2;
  const density = maxEdges === 0 ? 0 : (g.edges.length / maxEdges * 100);

  const byReason = {};
  g.edges.forEach(function (e) { byReason[e.reason] = (byReason[e.reason] || 0) + 1; });

  console.log('===== 충돌 그래프 =====');
  console.log('세탁 대상 옷(정점) 수 :', n, '벌   / 물세탁 불가로 제외:', g.excluded.length, '벌');
  console.log('가능한 모든 쌍        :', maxEdges, '쌍');
  console.log('충돌 쌍(간선) 수      :', g.edges.length, '개  (' + density.toFixed(1) + '%)');
  console.log('이유별 개수           :', byReason);
  g.edges.forEach(function (e, i) {
    console.log((i + 1) + '. ' + e.a.item + '(' + e.a.color_family + ')  <->  ' +
      e.b.item + '(' + e.b.color_family + ')   : ' + e.reason);
  });

  let html = '<div class="stats">';
  html += '<div><b>' + n + '</b><span>세탁 대상(정점)</span></div>';
  html += '<div><b>' + g.edges.length + '</b><span>충돌 쌍(간선)</span></div>';
  html += '<div><b>' + density.toFixed(1) + '%</b><span>전체 쌍 대비</span></div>';
  html += '</div>';
  html += '<p class="hint">이유별 — ' +
    Object.keys(byReason).map(function (k) { return k + ' ' + byReason[k] + '개'; }).join(' · ') + '</p>';
  if (g.excluded.length > 0) {
    html += '<p class="hint">물세탁 불가라 제외: ' +
      g.excluded.map(function (c) { return c.item; }).join(', ') + '</p>';
  }
  html += '<div class="table-wrap"><table><thead><tr><th>#</th><th>옷 A</th><th>옷 B</th><th>충돌 이유</th></tr></thead><tbody>';
  g.edges.slice(0, 30).forEach(function (e, i) {
    html += '<tr><td>' + (i + 1) + '</td><td>' + e.a.item + ' (' + e.a.color_family + ')</td>' +
            '<td>' + e.b.item + ' (' + e.b.color_family + ')</td><td>' + e.reason + '</td></tr>';
  });
  html += '</tbody></table></div>';
  if (g.edges.length > 30) html += '<p class="hint">화면에는 앞 30개만 보입니다. 전체는 콘솔(F12)에서 확인하세요.</p>';
  document.getElementById('graph-result').innerHTML = html;
});


/* =====================================================================
   8. 회차의 성질과 소요 시간
   ===================================================================== */
const loadWeightG = function (L) { return L.reduce(function (s, c) { return s + c.weight_g; }, 0); };
const loadTemp = function (L) {
  return Math.min.apply(null, L.map(function (c) { return WASH_BY_CODE[c.wash_code].max_temp_c; }));
};
function loadSpin(L) {
  if (L.some(function (c) { return c.spin_code === 'SPIN_NO'; }))   return '금지';
  if (L.some(function (c) { return c.spin_code === 'SPIN_MILD'; })) return '약하게';
  return '일반';
}
const canTumble = function (c) { return WASH_BY_CODE[c.dry_code].dry_method.indexOf('기계건조') === 0; };

function washMinutes(L) {
  const t = loadTemp(L);
  if (loadSpin(L) !== '일반' || t <= 30) return 40;
  if (t <= 50) return 55;
  return 80;
}
function dryMinutes(L) {
  const kg = L.filter(canTumble).reduce(function (s, c) { return s + c.weight_g; }, 0) / 1000;
  return kg === 0 ? 0 : Math.max(20, Math.round(kg * 15));
}
function countViolations(loads) {
  let v = 0;
  loads.forEach(function (L) {
    for (let i = 0; i < L.length; i++)
      for (let j = i + 1; j < L.length; j++)
        if (conflictReason(L[i], L[j]) !== null) v++;
  });
  return v;
}


/* =====================================================================
   9. FFD — 충돌 제약 빈 패킹 / 관행적 분류
   ===================================================================== */
function packFFD(list) {
  const cap = capacity * 1000;
  const sorted = list.slice().sort(function (a, b) { return b.weight_g - a.weight_g; });
  const loads = [];
  sorted.forEach(function (c) {
    let placed = false;
    for (let k = 0; k < loads.length; k++) {
      const L = loads[k];
      if (loadWeightG(L) + c.weight_g > cap) continue;
      if (L.some(function (x) { return conflictReason(x, c) !== null; })) continue;
      L.push(c); placed = true; break;
    }
    if (!placed) loads.push([c]);
  });
  return loads;
}

function packConventional(list) {
  const cap = capacity * 1000;
  const groups = { '흰옷': [], '색옷': [], '수건': [] };
  list.forEach(function (c) {
    if (c.item.indexOf('수건') >= 0)  groups['수건'].push(c);
    else if (c.color_family === '흰') groups['흰옷'].push(c);
    else                              groups['색옷'].push(c);
  });
  const loads = [];
  Object.keys(groups).forEach(function (k) {
    let cur = [], w = 0;
    groups[k].forEach(function (c) {
      if (w + c.weight_g > cap) { if (cur.length) loads.push(cur); cur = []; w = 0; }
      cur.push(c); w += c.weight_g;
    });
    if (cur.length) loads.push(cur);
  });
  return loads;
}


/* =====================================================================
   10. 존슨 규칙 (세탁기 → 건조기 2단계 흐름 작업장)
   ===================================================================== */
function johnsonOrder(jobs) {
  const front = jobs.filter(function (j) { return j.wash <= j.dry; })
                    .sort(function (a, b) { return a.wash - b.wash; });
  const back  = jobs.filter(function (j) { return j.wash >  j.dry; })
                    .sort(function (a, b) { return b.dry - a.dry; });
  return front.concat(back);
}

function schedule(seq) {
  let t1 = 0, t2 = 0;
  const bars = [];
  seq.forEach(function (j) {
    const w0 = t1; t1 += j.wash;
    const d0 = Math.max(t2, t1); t2 = d0 + j.dry;
    bars.push({ job: j, washStart: w0, washEnd: t1, dryStart: d0, dryEnd: t2 });
  });
  return { makespan: Math.max(t1, t2), bars: bars };
}

function bruteForceBest(jobs) {
  if (jobs.length > 8) return null;
  let best = Infinity, worst = 0, count = 0;
  (function permute(rest, acc) {
    if (rest.length === 0) {
      const m = schedule(acc).makespan;
      if (m < best) best = m;
      if (m > worst) worst = m;
      count++; return;
    }
    for (let i = 0; i < rest.length; i++)
      permute(rest.slice(0, i).concat(rest.slice(i + 1)), acc.concat([rest[i]]));
  })(jobs, []);
  return { best: best, worst: worst, count: count };
}


/* =====================================================================
   11. 실행 — 회차 분할, 비교, 간트, 이력 저장
   ===================================================================== */
function minLabel(m) {
  const h = Math.floor(m / 60), r = m % 60;
  return h > 0 ? (h + '시간' + (r ? ' ' + r + '분' : '')) : (m + '분');
}

document.getElementById('run-pack').addEventListener('click', async function () {
  if (clothes.length === 0) { alert('등록된 옷이 없습니다. "표본 42벌 넣기" 를 먼저 눌러보세요.'); return; }
  capacity = Number(capEl.value);

  const washable = clothes.filter(function (c) { return c.wash_code !== 'NO_WASH'; });
  const excluded = clothes.filter(function (c) { return c.wash_code === 'NO_WASH'; });

  const opt  = packFFD(washable);
  const conv = packConventional(washable);

  const optJobs  = opt.map(function (L, i)  { return { idx: i, L: L, wash: washMinutes(L), dry: dryMinutes(L) }; });
  const convJobs = conv.map(function (L, i) { return { idx: i, L: L, wash: washMinutes(L), dry: dryMinutes(L) }; });

  const optSched  = schedule(johnsonOrder(optJobs));
  const convSched = schedule(johnsonOrder(convJobs));
  const optViol   = countViolations(opt);
  const convViol  = countViolations(conv);

  console.log('===== 회차 분할 =====');
  console.log('관행적 분류 : ' + conv.length + '회차 / 제약 위반 ' + convViol + '건 / 총 ' + convSched.makespan + '분');
  console.log('최적화(FFD) : ' + opt.length + '회차 / 제약 위반 ' + optViol + '건 / 총 ' + optSched.makespan + '분');
  opt.forEach(function (L, i) {
    console.log('  회차 ' + (i + 1) + ': ' + L.length + '벌 ' + (loadWeightG(L) / 1000).toFixed(1) + 'kg, ' +
      loadTemp(L) + '도, 탈수 ' + loadSpin(L) + ', 세탁 ' + washMinutes(L) + '분 + 건조 ' + dryMinutes(L) + '분');
    console.log('     ' + L.map(function (c) { return c.item + '(' + c.color_family + ')'; }).join(', '));
  });

  let html = '<div class="compare">';
  html += '<div class="compare-col"><h3>관행적 분류</h3><p class="sub2">흰옷 / 색옷 / 수건으로만 나눔</p>' +
          '<div class="big">' + conv.length + '<span>회차</span></div>' +
          '<div class="big bad">' + convViol + '<span>제약 위반</span></div>' +
          '<p class="sub2">총 소요 ' + minLabel(convSched.makespan) + '</p></div>';
  html += '<div class="compare-col"><h3>최적화 (FFD)</h3><p class="sub2">충돌 제약을 지키며 빈 패킹</p>' +
          '<div class="big">' + opt.length + '<span>회차</span></div>' +
          '<div class="big good">' + optViol + '<span>제약 위반</span></div>' +
          '<p class="sub2">총 소요 ' + minLabel(optSched.makespan) + '</p></div>';
  html += '</div>';
  html += '<p class="note">관행적 분류는 회차 수는 적지만 한 회차 안에 같이 넣으면 안 되는 옷 쌍이 ' + convViol +
          '건 남습니다. 이염되거나 옷이 상할 수 있는 조합입니다. 최적화는 회차가 ' + opt.length +
          '번으로 늘어나는 대신 그런 조합이 하나도 없습니다.</p>';
  if (excluded.length > 0) {
    html += '<p class="hint">물세탁 불가로 두 방식 모두에서 제외: ' +
      excluded.map(function (c) { return c.item; }).join(', ') + '</p>';
  }

  html += '<h3 class="sub-head">최적화 회차 구성</h3>';
  html += '<div class="table-wrap"><table><thead><tr><th>회차</th><th>벌수</th><th>무게</th>' +
          '<th>물온도</th><th>탈수</th><th>세탁</th><th>건조</th><th>구성</th></tr></thead><tbody>';
  opt.forEach(function (L, i) {
    const names = {};
    L.forEach(function (c) { names[c.item] = (names[c.item] || 0) + 1; });
    const txt = Object.keys(names).map(function (k) { return names[k] > 1 ? k + ' x' + names[k] : k; }).join(', ');
    html += '<tr><td>' + (i + 1) + '</td><td class="num">' + L.length + '벌</td>' +
            '<td class="num">' + (loadWeightG(L) / 1000).toFixed(1) + 'kg</td>' +
            '<td class="num">' + loadTemp(L) + '도</td><td>' + loadSpin(L) + '</td>' +
            '<td class="num">' + washMinutes(L) + '분</td>' +
            '<td class="num">' + (dryMinutes(L) === 0 ? '자연건조' : dryMinutes(L) + '분') + '</td>' +
            '<td class="wrap">' + txt + '</td></tr>';
  });
  html += '</tbody></table></div>';
  document.getElementById('pack-result').innerHTML = html;

  drawGantt(optJobs, optSched);

  // 이력 저장
  if (db) {
    try {
      await dbSaveRun({
        clothes_count: clothes.length, capacity_kg: capacity,
        opt_loads: opt.length,  opt_violations: optViol,  opt_minutes: optSched.makespan,
        conv_loads: conv.length, conv_violations: convViol, conv_minutes: convSched.makespan
      });
      await refreshHistory();
    } catch (err) {
      console.warn('이력 저장 실패', err);
    }
  } else {
    document.getElementById('history-result').innerHTML =
      '<p class="hint">데이터베이스에 연결되지 않아 이력을 저장하지 못했습니다.</p>';
  }
});


function drawGantt(jobs, sched) {
  const order = johnsonOrder(jobs);
  const total = sched.makespan;
  const check = bruteForceBest(jobs);

  let html = '<div class="stats">';
  html += '<div><b>' + minLabel(total) + '</b><span>총 소요 시간</span></div>';
  html += '<div><b>' + order.length + '</b><span>회차</span></div>';
  if (check) html += '<div><b>' + minLabel(check.worst) + '</b><span>가장 나쁜 순서</span></div>';
  html += '</div>';
  html += '<p class="hint">순서 — ' + order.map(function (j) { return '회차 ' + (j.idx + 1); }).join(' → ') + '</p>';

  html += '<div class="gantt">';
  ['세탁기', '건조기'].forEach(function (machine, row) {
    html += '<div class="gantt-row"><span class="gantt-label">' + machine + '</span><div class="gantt-track">';
    sched.bars.forEach(function (b) {
      const s = row === 0 ? b.washStart : b.dryStart;
      const e = row === 0 ? b.washEnd   : b.dryEnd;
      if (e - s <= 0) return;
      const left = (s / total * 100).toFixed(2), width = ((e - s) / total * 100).toFixed(2);
      html += '<div class="bar ' + (row === 0 ? 'wash' : 'dry') + '" style="left:' + left + '%;width:' + width + '%" ' +
              'title="회차 ' + (b.job.idx + 1) + ' : ' + s + '~' + e + '분">' + (width > 7 ? (b.job.idx + 1) : '') + '</div>';
    });
    html += '</div></div>';
  });
  html += '<div class="gantt-row"><span class="gantt-label"></span><div class="gantt-axis">';
  for (let t = 0; t <= total; t += 60)
    html += '<span style="left:' + (t / total * 100).toFixed(2) + '%">' + (t / 60) + 'h</span>';
  html += '</div></div></div>';

  if (check) {
    const ok = (total === check.best);
    html += '<p class="note">모든 순서 ' + check.count + '가지를 전부 돌려본 결과 가장 짧은 시간은 ' + minLabel(check.best) +
      ', 가장 긴 시간은 ' + minLabel(check.worst) + '입니다. 존슨 규칙이 만든 순서는 ' + minLabel(total) + '이므로 ' +
      (ok ? '최소와 같습니다 — 존슨 규칙이 최적해를 준 것이 확인됩니다. '
          : '최소와 다릅니다. 시간 계산 방식을 다시 확인해야 합니다. ') +
      '순서를 잘못 정하면 ' + (check.worst - check.best) + '분을 더 쓰게 됩니다.</p>';
    console.log('전수 탐색 ' + check.count + '가지 / 최소 ' + check.best + '분 / 최대 ' + check.worst + '분');
  }
  document.getElementById('gantt-result').innerHTML = html;
}


/* =====================================================================
   12. 실험 이력과 변화 그래프
   두 측정값(회차 수 / 총 시간)은 단위가 달라 한 그래프에 겹치지 않고
   그래프를 두 개로 나눈다. 색은 관행(주황) / 최적화(청록) 두 가지만 쓴다.
   ===================================================================== */
function barChart(title, unit, runs, pickConv, pickOpt) {
  const vals = [];
  runs.forEach(function (r) { vals.push(pickConv(r), pickOpt(r)); });
  const max = Math.max.apply(null, vals.concat([1]));

  let h = '<div class="hist-chart"><h4>' + title + '</h4><div class="hist-plot">';
  runs.forEach(function (r, i) {
    const a = pickConv(r), b = pickOpt(r);
    h += '<div class="hist-group">' +
         '<div class="hist-bars">' +
           '<div class="hist-bar-wrap"><span class="hist-val">' + a + '</span>' +
             '<div class="hist-bar conv" style="height:' + (a / max * 100) + '%" ' +
             'title="' + (i + 1) + '회차 실행 · 관행 ' + a + unit + '"></div></div>' +
           '<div class="hist-bar-wrap"><span class="hist-val">' + b + '</span>' +
             '<div class="hist-bar opt" style="height:' + (b / max * 100) + '%" ' +
             'title="' + (i + 1) + '회차 실행 · 최적화 ' + b + unit + '"></div></div>' +
         '</div><span class="hist-x">' + (i + 1) + '</span></div>';
  });
  h += '</div><p class="hist-axis-label">실행 횟수</p></div>';
  return h;
}

async function refreshHistory() {
  const box = document.getElementById('history-result');
  if (!db) { box.innerHTML = '<p class="hint">데이터베이스에 연결되지 않아 이력을 볼 수 없습니다.</p>'; return; }

  let runs;
  try { runs = await dbLoadRuns(); }
  catch (err) { box.innerHTML = '<p class="hint">이력을 불러오지 못했습니다: ' + err.message + '</p>'; return; }

  if (!runs || runs.length === 0) {
    box.innerHTML = '<p class="hint">아직 실행 기록이 없습니다. "회차 나누고 비교하기" 를 누르면 쌓입니다.</p>';
    return;
  }

  let html = '<div class="legend">' +
    '<span><i class="sw conv"></i>관행적 분류</span>' +
    '<span><i class="sw opt"></i>최적화 (FFD)</span></div>';

  html += '<div class="hist-wrap">';
  html += barChart('세탁 회차 수', '회차', runs,
            function (r) { return r.conv_loads; }, function (r) { return r.opt_loads; });
  html += barChart('제약 위반 건수', '건', runs,
            function (r) { return r.conv_violations; }, function (r) { return r.opt_violations; });
  html += '</div>';

  html += '<div class="table-wrap"><table><thead><tr><th>#</th><th>옷</th><th>용량</th>' +
          '<th>관행 회차</th><th>관행 위반</th><th>관행 시간</th>' +
          '<th>최적 회차</th><th>최적 위반</th><th>최적 시간</th></tr></thead><tbody>';
  runs.forEach(function (r, i) {
    html += '<tr><td>' + (i + 1) + '</td><td class="num">' + r.clothes_count + '벌</td>' +
            '<td class="num">' + r.capacity_kg + 'kg</td>' +
            '<td class="num">' + r.conv_loads + '</td><td class="num">' + r.conv_violations + '</td>' +
            '<td class="num">' + r.conv_minutes + '분</td>' +
            '<td class="num">' + r.opt_loads + '</td><td class="num">' + r.opt_violations + '</td>' +
            '<td class="num">' + r.opt_minutes + '분</td></tr>';
  });
  html += '</tbody></table></div>';
  box.innerHTML = html;
}


/* =====================================================================
   13. 시작
   ===================================================================== */
(async function init() {
  showSymbolInfo();

  db = connectDB();

  if (!db) {
    setStatus('데이터베이스에 연결되지 않아 이 브라우저에서만 동작합니다 (새로고침하면 사라짐)', 'warn');
    clothes = CLOTHES_SAMPLE.slice();
    render();
    return;
  }

  try {
    clothes = await dbLoadClothes();
    const cap = await dbLoadCapacity();
    if (cap !== null) { capacity = cap; capEl.value = cap; }
    render();
    await refreshHistory();

    if (clothes.length === 0) {
      setStatus('데이터베이스 연결됨 — 저장된 옷이 없습니다. "표본 42벌 넣기" 를 눌러보세요.', 'ok');
    } else {
      setStatus('데이터베이스 연결됨 — 저장된 옷 ' + clothes.length + '벌을 불러왔습니다', 'ok');
    }
  } catch (err) {
    console.error(err);
    setStatus('데이터베이스 오류: ' + err.message + ' — 표본 데이터로 대신 표시합니다', 'warn');
    db = null;
    clothes = CLOTHES_SAMPLE.slice();
    render();
  }
})();
