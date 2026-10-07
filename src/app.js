/* =====================================================================
   세탁물 분류 · 세탁 순서 최적화 플랫폼

   2차시: 옷 등록 폼 + 목록 쌓기
   3차시: 충돌 그래프 구성 (이염 / 온도 불일치 / 섬유 손상)
   4차시: 충돌 제약 빈 패킹(FFD)으로 회차 분할 + 관행적 분류와 비교
          존슨 규칙으로 세탁 순서 결정 + 간트 차트 + 총 소요 시간

   주의: 이 파일보다 ../data/data.js 가 먼저 로드되어야 한다.
   ===================================================================== */

let clothes = CLOTHES_SAMPLE.slice();


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
   2. 기호를 고르면 값 자동 표시
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
   3. 등록 목록 그리기
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
      '<td>' + d.dry_method + '</td>';
    tbody.appendChild(tr);
  });

  const totalKg = clothes.reduce(function (s, c) { return s + c.weight_g; }, 0) / 1000;
  document.getElementById('count').textContent =
    clothes.length + '벌 · 합계 ' + totalKg.toFixed(1) + 'kg';
}


/* =====================================================================
   4. 저장 버튼
   ===================================================================== */
document.getElementById('clothes-form').addEventListener('submit', function (e) {
  e.preventDefault();
  clothes.push({
    id: 'C' + String(clothes.length + 1).padStart(2, '0'),
    item:         document.getElementById('item').value,
    material:     document.getElementById('material').value,
    color_family: document.getElementById('color-family').value,
    color_depth:  document.getElementById('color-depth').value,
    weight_g:     Number(document.getElementById('weight').value),
    soil_level:   Number(document.getElementById('soil').value),
    is_new:       document.getElementById('is-new').checked,
    wash_code:    washSelect.value,
    spin_code:    spinSelect.value,
    dry_code:     drySelect.value,
    weight_source: '직접 입력'
  });
  render();
  document.getElementById('item').value = '';
  document.getElementById('item').focus();
});


/* =====================================================================
   5. 충돌 판정 (3차시)
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
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const reason = conflictReason(nodes[i], nodes[j]);
      if (reason !== null) edges.push({ a: nodes[i], b: nodes[j], reason: reason });
    }
  }
  return { nodes: nodes, edges: edges, excluded: excluded };
}

document.getElementById('build-graph').addEventListener('click', function () {
  const graph = buildConflictGraph(clothes);
  const n = graph.nodes.length;
  const maxEdges = n * (n - 1) / 2;
  const density = maxEdges === 0 ? 0 : (graph.edges.length / maxEdges * 100);

  const byReason = {};
  graph.edges.forEach(function (e) { byReason[e.reason] = (byReason[e.reason] || 0) + 1; });

  console.log('===== 충돌 그래프 =====');
  console.log('세탁 대상 옷(정점) 수 :', n, '벌   / 물세탁 불가로 제외:', graph.excluded.length, '벌');
  console.log('가능한 모든 쌍        :', maxEdges, '쌍');
  console.log('충돌 쌍(간선) 수      :', graph.edges.length, '개  (' + density.toFixed(1) + '%)');
  console.log('이유별 개수           :', byReason);
  console.log('----- 충돌 쌍 목록 -----');
  graph.edges.forEach(function (e, i) {
    console.log((i + 1) + '. ' + e.a.id + ' ' + e.a.item + '(' + e.a.color_family + ')' +
      '  <->  ' + e.b.id + ' ' + e.b.item + '(' + e.b.color_family + ')' + '   : ' + e.reason);
  });

  let html = '<div class="stats">';
  html += '<div><b>' + n + '</b><span>세탁 대상(정점)</span></div>';
  html += '<div><b>' + graph.edges.length + '</b><span>충돌 쌍(간선)</span></div>';
  html += '<div><b>' + density.toFixed(1) + '%</b><span>전체 쌍 대비</span></div>';
  html += '</div>';
  html += '<p class="hint">이유별 — ' +
    Object.keys(byReason).map(function (k) { return k + ' ' + byReason[k] + '개'; }).join(' · ') + '</p>';
  if (graph.excluded.length > 0) {
    html += '<p class="hint">물세탁 불가라 제외: ' +
      graph.excluded.map(function (c) { return c.item; }).join(', ') + '</p>';
  }
  html += '<div class="table-wrap"><table><thead><tr><th>#</th><th>옷 A</th><th>옷 B</th><th>충돌 이유</th></tr></thead><tbody>';
  graph.edges.slice(0, 30).forEach(function (e, i) {
    html += '<tr><td>' + (i + 1) + '</td><td>' + e.a.item + ' (' + e.a.color_family + ')</td>' +
            '<td>' + e.b.item + ' (' + e.b.color_family + ')</td><td>' + e.reason + '</td></tr>';
  });
  html += '</tbody></table></div>';
  if (graph.edges.length > 30) {
    html += '<p class="hint">화면에는 앞 30개만 보입니다. 전체 목록은 콘솔(F12)에서 확인하세요.</p>';
  }
  document.getElementById('graph-result').innerHTML = html;
});


/* =====================================================================
   6. 회차의 성질과 소요 시간 (4차시)
   ===================================================================== */
function capacityG() {
  return Number(document.getElementById('capacity').value) * 1000;
}
function loadWeightG(L) {
  return L.reduce(function (s, c) { return s + c.weight_g; }, 0);
}
// 한 회차의 물 온도 = 그 회차 옷들의 허용 최고 온도 중 가장 낮은 값
function loadTemp(L) {
  return Math.min.apply(null, L.map(function (c) { return WASH_BY_CODE[c.wash_code].max_temp_c; }));
}
function loadSpin(L) {
  if (L.some(function (c) { return c.spin_code === 'SPIN_NO'; }))   return '금지';
  if (L.some(function (c) { return c.spin_code === 'SPIN_MILD'; })) return '약하게';
  return '일반';
}
function canTumble(c) {
  return WASH_BY_CODE[c.dry_code].dry_method.indexOf('기계건조') === 0;
}

// 세탁 시간: 저온이거나 섬세 코스면 짧고, 삶는 회차는 길다
function washMinutes(L) {
  const t = loadTemp(L);
  if (loadSpin(L) !== '일반' || t <= 30) return 40;
  if (t <= 50) return 55;
  return 80;
}
// 건조 시간: 기계건조가 가능한 옷의 무게만큼만
function dryMinutes(L) {
  const kg = L.filter(canTumble).reduce(function (s, c) { return s + c.weight_g; }, 0) / 1000;
  if (kg === 0) return 0;
  return Math.max(20, Math.round(kg * 15));
}
// 한 회차 안에 남아 있는 충돌 쌍의 수
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
   7. FFD — 충돌 제약 빈 패킹
   무게가 무거운 옷부터, 용량이 남고 충돌도 없는 "첫 번째" 회차에 넣는다.
   들어갈 회차가 없으면 새 회차를 연다.
   ===================================================================== */
function packFFD(list) {
  const cap = capacityG();
  const sorted = list.slice().sort(function (a, b) { return b.weight_g - a.weight_g; });
  const loads = [];

  sorted.forEach(function (c) {
    let placed = false;
    for (let k = 0; k < loads.length; k++) {
      const L = loads[k];
      if (loadWeightG(L) + c.weight_g > cap) continue;          // 용량 초과
      const clash = L.some(function (x) { return conflictReason(x, c) !== null; });
      if (clash) continue;                                       // 충돌
      L.push(c); placed = true; break;                           // 첫 번째 자리에 넣기
    }
    if (!placed) loads.push([c]);
  });

  return loads;
}

/* 관행적 분류 — 흰옷 / 색옷 / 수건 세 무더기로만 나누고 용량만 지킨다.
   충돌은 보지 않기 때문에 회차는 적게 나오지만 위반이 남는다. */
function packConventional(list) {
  const cap = capacityG();
  const groups = { '흰옷': [], '색옷': [], '수건': [] };

  list.forEach(function (c) {
    if (c.item.indexOf('수건') >= 0)        groups['수건'].push(c);
    else if (c.color_family === '흰')       groups['흰옷'].push(c);
    else                                    groups['색옷'].push(c);
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
   8. 존슨 규칙 — 세탁기(1단계) → 건조기(2단계) 2단계 흐름 작업장
   세탁 시간 <= 건조 시간인 회차는 앞쪽에 세탁 시간 오름차순,
   나머지는 뒤쪽에 건조 시간 내림차순으로 놓는다.
   ===================================================================== */
function johnsonOrder(jobs) {
  const front = jobs.filter(function (j) { return j.wash <= j.dry; })
                    .sort(function (a, b) { return a.wash - b.wash; });
  const back  = jobs.filter(function (j) { return j.wash >  j.dry; })
                    .sort(function (a, b) { return b.dry - a.dry; });
  return front.concat(back);
}

// 순서를 정했을 때 세탁기·건조기가 언제 돌아가는지와 총 소요 시간
function schedule(seq) {
  let t1 = 0, t2 = 0;
  const bars = [];
  seq.forEach(function (j) {
    const w0 = t1;  t1 = t1 + j.wash;          // 세탁기는 쉬지 않고 이어서
    const d0 = Math.max(t2, t1);               // 건조기는 세탁이 끝나야 시작
    t2 = d0 + j.dry;
    bars.push({ job: j, washStart: w0, washEnd: t1, dryStart: d0, dryEnd: t2 });
  });
  return { makespan: Math.max(t1, t2), bars: bars };
}

// 회차가 적을 때는 모든 순서를 돌려보고 존슨 규칙이 정말 최소인지 확인
function bruteForceBest(jobs) {
  if (jobs.length > 8) return null;
  let best = Infinity, worst = 0, count = 0;
  (function permute(rest, acc) {
    if (rest.length === 0) {
      const m = schedule(acc).makespan;
      if (m < best) best = m;
      if (m > worst) worst = m;
      count++;
      return;
    }
    for (let i = 0; i < rest.length; i++) {
      permute(rest.slice(0, i).concat(rest.slice(i + 1)), acc.concat([rest[i]]));
    }
  })(jobs, []);
  return { best: best, worst: worst, count: count };
}


/* =====================================================================
   9. 버튼 — 회차를 나누고, 비교하고, 순서를 정해 간트 차트를 그린다
   ===================================================================== */
function minLabel(m) {
  const h = Math.floor(m / 60), r = m % 60;
  return h > 0 ? (h + '시간 ' + (r ? r + '분' : '')) : (m + '분');
}

document.getElementById('run-pack').addEventListener('click', function () {
  const washable = clothes.filter(function (c) { return c.wash_code !== 'NO_WASH'; });
  const excluded = clothes.filter(function (c) { return c.wash_code === 'NO_WASH'; });

  const opt  = packFFD(washable);
  const conv = packConventional(washable);

  const optJobs  = opt.map(function (L, i)  { return { idx: i, L: L, wash: washMinutes(L), dry: dryMinutes(L) }; });
  const convJobs = conv.map(function (L, i) { return { idx: i, L: L, wash: washMinutes(L), dry: dryMinutes(L) }; });

  const optSched  = schedule(johnsonOrder(optJobs));
  const convSched = schedule(johnsonOrder(convJobs));

  const optViol  = countViolations(opt);
  const convViol = countViolations(conv);

  /* ---------- 콘솔 ---------- */
  console.log('===== 회차 분할 =====');
  console.log('관행적 분류 : ' + conv.length + '회차 / 제약 위반 ' + convViol + '건 / 총 ' + convSched.makespan + '분');
  console.log('최적화(FFD) : ' + opt.length + '회차 / 제약 위반 ' + optViol + '건 / 총 ' + optSched.makespan + '분');
  opt.forEach(function (L, i) {
    console.log('  회차 ' + (i + 1) + ': ' + L.length + '벌 ' + (loadWeightG(L) / 1000).toFixed(1) + 'kg, ' +
      loadTemp(L) + '도, 탈수 ' + loadSpin(L) + ', 세탁 ' + washMinutes(L) + '분 + 건조 ' + dryMinutes(L) + '분');
    console.log('     ' + L.map(function (c) { return c.item + '(' + c.color_family + ')'; }).join(', '));
  });

  /* ---------- 비교 ---------- */
  let html = '<div class="compare">';
  html += '<div class="compare-col">' +
            '<h3>관행적 분류</h3><p class="sub2">흰옷 / 색옷 / 수건으로만 나눔</p>' +
            '<div class="big">' + conv.length + '<span>회차</span></div>' +
            '<div class="big bad">' + convViol + '<span>제약 위반</span></div>' +
            '<p class="sub2">총 소요 ' + minLabel(convSched.makespan) + '</p>' +
          '</div>';
  html += '<div class="compare-col">' +
            '<h3>최적화 (FFD)</h3><p class="sub2">충돌 제약을 지키며 빈 패킹</p>' +
            '<div class="big">' + opt.length + '<span>회차</span></div>' +
            '<div class="big good">' + optViol + '<span>제약 위반</span></div>' +
            '<p class="sub2">총 소요 ' + minLabel(optSched.makespan) + '</p>' +
          '</div>';
  html += '</div>';

  html += '<p class="note">관행적 분류는 회차 수는 적지만 한 회차 안에 같이 넣으면 안 되는 옷 쌍이 ' +
          convViol + '건 남습니다. 이염되거나 옷이 상할 수 있는 조합입니다. ' +
          '최적화는 회차가 ' + opt.length + '번으로 늘어나는 대신 그런 조합이 하나도 없습니다.</p>';

  if (excluded.length > 0) {
    html += '<p class="hint">물세탁 불가로 두 방식 모두에서 제외: ' +
      excluded.map(function (c) { return c.item; }).join(', ') + '</p>';
  }

  /* ---------- 최적화 회차 상세 ---------- */
  html += '<h3 class="sub-head">최적화 회차 구성</h3>';
  html += '<div class="table-wrap"><table><thead><tr>' +
          '<th>회차</th><th>벌수</th><th>무게</th><th>물온도</th><th>탈수</th><th>세탁</th><th>건조</th><th>구성</th>' +
          '</tr></thead><tbody>';
  opt.forEach(function (L, i) {
    const names = {};
    L.forEach(function (c) { const k = c.item; names[k] = (names[k] || 0) + 1; });
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

  /* ---------- 간트 차트 ---------- */
  drawGantt(optJobs, optSched);
});


function drawGantt(jobs, sched) {
  const order = johnsonOrder(jobs);
  const total = sched.makespan;
  const check = bruteForceBest(jobs);

  let html = '<div class="stats">';
  html += '<div><b>' + minLabel(total) + '</b><span>총 소요 시간</span></div>';
  html += '<div><b>' + order.length + '</b><span>회차</span></div>';
  if (check) {
    html += '<div><b>' + minLabel(check.worst) + '</b><span>가장 나쁜 순서</span></div>';
  }
  html += '</div>';

  html += '<p class="hint">순서 — ' +
    order.map(function (j) { return '회차 ' + (j.idx + 1); }).join(' → ') + '</p>';

  // 막대
  html += '<div class="gantt">';
  ['세탁기', '건조기'].forEach(function (machine, row) {
    html += '<div class="gantt-row"><span class="gantt-label">' + machine + '</span><div class="gantt-track">';
    sched.bars.forEach(function (b) {
      const s = row === 0 ? b.washStart : b.dryStart;
      const e = row === 0 ? b.washEnd   : b.dryEnd;
      if (e - s <= 0) return;
      const left  = (s / total * 100).toFixed(2);
      const width = ((e - s) / total * 100).toFixed(2);
      html += '<div class="bar ' + (row === 0 ? 'wash' : 'dry') + '" ' +
              'style="left:' + left + '%;width:' + width + '%" ' +
              'title="회차 ' + (b.job.idx + 1) + ' : ' + s + '~' + e + '분">' +
              (width > 7 ? (b.job.idx + 1) : '') + '</div>';
    });
    html += '</div></div>';
  });
  // 시간 축
  html += '<div class="gantt-row"><span class="gantt-label"></span><div class="gantt-axis">';
  for (let t = 0; t <= total; t += 60) {
    html += '<span style="left:' + (t / total * 100).toFixed(2) + '%">' + (t / 60) + 'h</span>';
  }
  html += '</div></div></div>';

  if (check) {
    const ok = (total === check.best);
    html += '<p class="note">' +
      '모든 순서 ' + check.count + '가지를 전부 돌려본 결과 가장 짧은 시간은 ' + minLabel(check.best) + ', ' +
      '가장 긴 시간은 ' + minLabel(check.worst) + '입니다. ' +
      '존슨 규칙이 만든 순서는 ' + minLabel(total) + '이므로 ' +
      (ok ? '최소와 같습니다 — 존슨 규칙이 최적해를 준 것이 확인됩니다. '
          : '최소와 다릅니다. 시간 계산 방식을 다시 확인해야 합니다. ') +
      '순서를 잘못 정하면 ' + (check.worst - check.best) + '분을 더 쓰게 됩니다.</p>';
    console.log('전수 탐색 ' + check.count + '가지 / 최소 ' + check.best + '분 / 최대 ' + check.worst + '분');
    console.log('존슨 규칙 ' + total + '분 → ' + (ok ? '최적 확인' : '불일치'));
  }

  document.getElementById('gantt-result').innerHTML = html;
}


/* ---------- 처음 한 번 ---------- */
showSymbolInfo();
render();
