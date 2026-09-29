/* =====================================================================
   세탁물 분류 · 세탁 순서 최적화 플랫폼
   2차시: 옷 등록 폼 + 목록 쌓기
   3차시: 충돌 그래프 구성 (이염 / 온도 불일치 / 섬유 손상)

   주의: 이 파일보다 ../data/data.js 가 먼저 로드되어야 한다.
         data.js 가 주는 것 -> CLOTHES_SAMPLE, WASH_BY_CODE,
                               WASH_OPTIONS, SPIN_OPTIONS, DRY_OPTIONS
   ===================================================================== */

/* 등록된 옷을 담는 배열. 1회차에 만든 표본 42벌로 시작한다.
   slice() 를 쓰는 이유: 원본 CLOTHES_SAMPLE 을 건드리지 않고 복사본을 쓰기 위해서. */
let clothes = CLOTHES_SAMPLE.slice();


/* =====================================================================
   1. 세탁 기호 선택 칸 채우기
   기호가 19개라 HTML에 하나씩 적지 않고 데이터에서 만들어 넣는다.
   나중에 CSV에 기호를 추가하면 화면이 저절로 따라온다.
   ===================================================================== */
function fillSelect(selectEl, options) {
  options.forEach(function (o) {
    const el = document.createElement('option');
    el.value = o.code;          // 예: "W40"
    el.textContent = o.label;   // 예: "물세탁 40도"
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
   2. 기호를 고르면 허용 최고 온도·탈수·건조 방식을 자동으로 보여준다
   (계획서 IPO 의 "자동 표시" 부분)
   ===================================================================== */
const infoEl = document.getElementById('symbol-info');

function showSymbolInfo() {
  const w = WASH_BY_CODE[washSelect.value];
  const s = WASH_BY_CODE[spinSelect.value];
  const d = WASH_BY_CODE[drySelect.value];

  const temp = (w.max_temp_c === null) ? '물세탁 불가' : w.max_temp_c + '도';

  infoEl.textContent =
    '허용 최고 온도 ' + temp +
    '  /  탈수 ' + s.spin_level +
    '  /  건조 ' + d.dry_method;
}

washSelect.addEventListener('change', showSymbolInfo);
spinSelect.addEventListener('change', showSymbolInfo);
drySelect.addEventListener('change', showSymbolInfo);


/* =====================================================================
   3. 등록 목록 그리기
   목록을 그리는 코드는 이 함수 한 곳에만 둔다.
   옷이 추가될 때마다 화면을 직접 건드리지 않고 render() 를 다시 부른다.
   ===================================================================== */
function render() {
  const tbody = document.querySelector('#clothes-table tbody');
  tbody.innerHTML = '';

  clothes.forEach(function (c, i) {
    const w = WASH_BY_CODE[c.wash_code];
    const s = WASH_BY_CODE[c.spin_code];
    const d = WASH_BY_CODE[c.dry_code];

    const tr = document.createElement('tr');

    const temp = (w.max_temp_c === null) ? '불가' : w.max_temp_c + '도';
    const color = c.color_family + '(' + c.color_depth + ')' + (c.is_new ? ' 새옷' : '');

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

  const totalKg = clothes.reduce(function (sum, c) { return sum + c.weight_g; }, 0) / 1000;
  document.getElementById('count').textContent =
    clothes.length + '벌 · 합계 ' + totalKg.toFixed(1) + 'kg';
}


/* =====================================================================
   4. 저장 버튼 -> 배열에 넣고 목록 다시 그리기
   ===================================================================== */
document.getElementById('clothes-form').addEventListener('submit', function (e) {
  e.preventDefault();   // 폼 기본 동작(새로고침)을 막는다

  const newCloth = {
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
  };

  clothes.push(newCloth);
  render();

  document.getElementById('item').value = '';
  document.getElementById('item').focus();
});


/* =====================================================================
   5. 3차시 — 충돌 그래프
   같은 회차에 넣으면 안 되는 옷 쌍을 찾아 간선으로 잇는다.

   충돌 종류 (계획서 기준)
     (1) 이염 위험          : 진한 색 + (새 옷이거나 빨강) 과 연한 색이 만날 때
     (2) 온도 구간 불일치   : 허용 최고 온도 차이가 30도 이상일 때
     (3) 섬유 손상 위험     : 탈수 금지 옷과 일반 탈수 옷이 섞일 때

   물세탁 불가(NO_WASH) 옷은 애초에 세탁기에 못 들어가므로
   그래프를 만들기 전에 따로 빼 둔다.
   ===================================================================== */

// a 가 b 를 물들일 위험이 있는가?
function bleedRisk(a, b) {
  const aIsDark  = (a.color_depth === '진함');
  const aIsRisky = (a.is_new === true || a.color_family === '빨강');
  const bIsLight = (b.color_depth === '연함');
  return aIsDark && aIsRisky && bIsLight;
}

// 두 옷이 같은 회차에 들어갈 수 없는 이유. 없으면 null 을 준다.
function conflictReason(a, b) {
  // (1) 이염 — 어느 쪽이 물들이는지 모르니 양방향으로 확인
  if (bleedRisk(a, b) || bleedRisk(b, a)) {
    return '이염 위험';
  }

  // (2) 온도 구간 불일치
  const tempA = WASH_BY_CODE[a.wash_code].max_temp_c;
  const tempB = WASH_BY_CODE[b.wash_code].max_temp_c;
  if (Math.abs(tempA - tempB) >= 30) {
    return '온도 구간 불일치';
  }

  // (3) 섬유 손상 — 한 회차의 탈수 설정은 하나뿐이다
  const aNoSpin = (a.spin_code === 'SPIN_NO');
  const bNoSpin = (b.spin_code === 'SPIN_NO');
  if (aNoSpin !== bNoSpin) {
    return '섬유 손상 위험';
  }

  return null;   // 같이 돌려도 되는 쌍
}

// 충돌 그래프를 만든다. 결과: { nodes, edges, excluded }
function buildConflictGraph(list) {
  const excluded = list.filter(function (c) { return c.wash_code === 'NO_WASH'; });
  const nodes    = list.filter(function (c) { return c.wash_code !== 'NO_WASH'; });
  const edges = [];

  // 모든 쌍을 한 번씩만 본다 (j = i + 1 인 이유)
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const reason = conflictReason(nodes[i], nodes[j]);
      if (reason !== null) {
        edges.push({ a: nodes[i], b: nodes[j], reason: reason });
      }
    }
  }

  return { nodes: nodes, edges: edges, excluded: excluded };
}


/* ---------- 버튼을 누르면 그래프를 만들고 콘솔 + 화면에 출력 ---------- */
document.getElementById('build-graph').addEventListener('click', function () {
  const graph = buildConflictGraph(clothes);

  const n        = graph.nodes.length;
  const maxEdges = n * (n - 1) / 2;   // 모든 쌍의 개수
  const density  = maxEdges === 0 ? 0 : (graph.edges.length / maxEdges * 100);

  // 이유별로 몇 개인지 센다
  const byReason = {};
  graph.edges.forEach(function (e) {
    byReason[e.reason] = (byReason[e.reason] || 0) + 1;
  });

  /* ----- 콘솔 출력 (3차시 확인 지점) ----- */
  console.log('===== 충돌 그래프 =====');
  console.log('세탁 대상 옷(정점) 수 :', n, '벌   / 물세탁 불가로 제외:', graph.excluded.length, '벌');
  console.log('가능한 모든 쌍        :', maxEdges, '쌍');
  console.log('충돌 쌍(간선) 수      :', graph.edges.length, '개  (' + density.toFixed(1) + '%)');
  console.log('이유별 개수           :', byReason);
  console.log('----- 충돌 쌍 목록 -----');
  graph.edges.forEach(function (e, i) {
    console.log(
      (i + 1) + '. ' + e.a.id + ' ' + e.a.item + '(' + e.a.color_family + ')' +
      '  <->  ' + e.b.id + ' ' + e.b.item + '(' + e.b.color_family + ')' +
      '   : ' + e.reason
    );
  });

  /* ----- 화면 출력 ----- */
  let html = '<div class="stats">';
  html += '<div><b>' + n + '</b><span>세탁 대상(정점)</span></div>';
  html += '<div><b>' + graph.edges.length + '</b><span>충돌 쌍(간선)</span></div>';
  html += '<div><b>' + density.toFixed(1) + '%</b><span>전체 쌍 대비</span></div>';
  html += '</div>';

  html += '<p class="hint">이유별 — ';
  html += Object.keys(byReason).map(function (k) { return k + ' ' + byReason[k] + '개'; }).join(' · ');
  html += '</p>';

  if (graph.excluded.length > 0) {
    html += '<p class="hint">물세탁 불가라 제외: ' +
      graph.excluded.map(function (c) { return c.item; }).join(', ') + '</p>';
  }

  html += '<div class="table-wrap"><table><thead><tr>' +
          '<th>#</th><th>옷 A</th><th>옷 B</th><th>충돌 이유</th>' +
          '</tr></thead><tbody>';
  graph.edges.slice(0, 30).forEach(function (e, i) {
    html += '<tr><td>' + (i + 1) + '</td>' +
            '<td>' + e.a.item + ' (' + e.a.color_family + ')</td>' +
            '<td>' + e.b.item + ' (' + e.b.color_family + ')</td>' +
            '<td>' + e.reason + '</td></tr>';
  });
  html += '</tbody></table></div>';

  if (graph.edges.length > 30) {
    html += '<p class="hint">화면에는 앞 30개만 보입니다. 전체 목록은 콘솔(F12)에서 확인하세요.</p>';
  }

  document.getElementById('graph-result').innerHTML = html;
});


/* ---------- 화면을 처음 열었을 때 한 번 실행 ---------- */
showSymbolInfo();
render();
