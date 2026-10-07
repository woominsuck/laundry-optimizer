// 1회차에서 정리한 자료 (세탁 기호 변환표 + 표본 의류 42벌)
// index.html 에서 <script src="../data/data.js"></script> 로 불러 쓴다.

const WASH_SYMBOLS = [
  {"category": "wash", "code": "W95", "label": "물세탁 95도 (삶기 가능)", "max_temp_c": 95, "spin_level": "", "dry_method": "", "source": "KS K 0021 원문", "verify": "확인필요"},
  {"category": "wash", "code": "W60", "label": "물세탁 60도", "max_temp_c": 60, "spin_level": "", "dry_method": "", "source": "ISO 3758", "verify": "참고"},
  {"category": "wash", "code": "W50", "label": "물세탁 50도", "max_temp_c": 50, "spin_level": "", "dry_method": "", "source": "ISO 3758", "verify": "참고"},
  {"category": "wash", "code": "W40", "label": "물세탁 40도", "max_temp_c": 40, "spin_level": "", "dry_method": "", "source": "ISO 3758", "verify": "참고"},
  {"category": "wash", "code": "W40_MILD", "label": "물세탁 40도 약하게 (밑줄 1개)", "max_temp_c": 40, "spin_level": "", "dry_method": "", "source": "ISO 3758 + 보조기호", "verify": "참고"},
  {"category": "wash", "code": "W30", "label": "물세탁 30도", "max_temp_c": 30, "spin_level": "", "dry_method": "", "source": "ISO 3758", "verify": "참고"},
  {"category": "wash", "code": "W30_MILD", "label": "물세탁 30도 약하게 (밑줄 1개)", "max_temp_c": 30, "spin_level": "", "dry_method": "", "source": "ISO 3758 + 보조기호", "verify": "참고"},
  {"category": "wash", "code": "HAND", "label": "손세탁 (미지근한 물, 비틀지 않기)", "max_temp_c": 30, "spin_level": "", "dry_method": "", "source": "ISO 3758(손세탁 40도 이하)", "verify": "확인필요"},
  {"category": "wash", "code": "NO_WASH", "label": "물세탁 불가 (X) - 드라이클리닝만", "max_temp_c": null, "spin_level": "", "dry_method": "", "source": "보조기호 X=금지", "verify": "참고"},
  {"category": "spin", "code": "SPIN_NORMAL", "label": "탈수 가능 (일반)", "max_temp_c": null, "spin_level": "일반", "dry_method": "", "source": "namu.wiki", "verify": "참고"},
  {"category": "spin", "code": "SPIN_MILD", "label": "약하게 탈수 (밑줄 1개)", "max_temp_c": null, "spin_level": "약하게", "dry_method": "", "source": "보조기호 밑줄1", "verify": "참고"},
  {"category": "spin", "code": "SPIN_NO", "label": "짜지 말 것 / 탈수 금지 (X)", "max_temp_c": null, "spin_level": "금지", "dry_method": "", "source": "보조기호 X=금지", "verify": "참고"},
  {"category": "dry", "code": "TUMBLE_NORMAL", "label": "기계건조 가능 (일반 온도)", "max_temp_c": null, "spin_level": "", "dry_method": "기계건조", "source": "ISO 3758", "verify": "참고"},
  {"category": "dry", "code": "TUMBLE_LOW", "label": "기계건조 저온", "max_temp_c": null, "spin_level": "", "dry_method": "기계건조(저온)", "source": "ISO 3758", "verify": "참고"},
  {"category": "dry", "code": "TUMBLE_NO", "label": "기계건조 불가 (X)", "max_temp_c": null, "spin_level": "", "dry_method": "자연건조만", "source": "보조기호 X=금지", "verify": "참고"},
  {"category": "dry", "code": "HANG", "label": "옷걸이에 걸어 자연건조", "max_temp_c": null, "spin_level": "", "dry_method": "옷걸이", "source": "ISO 3758", "verify": "참고"},
  {"category": "dry", "code": "HANG_SHADE", "label": "옷걸이 + 그늘에서 건조", "max_temp_c": null, "spin_level": "", "dry_method": "옷걸이(그늘)", "source": "ISO 3758", "verify": "참고"},
  {"category": "dry", "code": "FLAT", "label": "평평하게 눕혀 자연건조", "max_temp_c": null, "spin_level": "", "dry_method": "평평하게", "source": "ISO 3758", "verify": "참고"},
  {"category": "dry", "code": "FLAT_SHADE", "label": "평평하게 + 그늘에서 건조", "max_temp_c": null, "spin_level": "", "dry_method": "평평하게(그늘)", "source": "ISO 3758", "verify": "참고"}
];

const CLOTHES_SAMPLE = [
  {"id": "C01", "item": "면 티셔츠", "material": "면", "color_family": "흰", "color_depth": "연함", "weight_g": 150, "soil_level": 2, "is_new": false, "wash_code": "W60", "spin_code": "SPIN_NORMAL", "dry_code": "TUMBLE_LOW", "weight_source": ""},
  {"id": "C02", "item": "면 티셔츠", "material": "면", "color_family": "흰", "color_depth": "연함", "weight_g": 150, "soil_level": 3, "is_new": false, "wash_code": "W60", "spin_code": "SPIN_NORMAL", "dry_code": "TUMBLE_LOW", "weight_source": ""},
  {"id": "C03", "item": "면 티셔츠", "material": "면", "color_family": "검정", "color_depth": "진함", "weight_g": 155, "soil_level": 2, "is_new": false, "wash_code": "W40", "spin_code": "SPIN_NORMAL", "dry_code": "TUMBLE_LOW", "weight_source": ""},
  {"id": "C04", "item": "면 티셔츠", "material": "면", "color_family": "빨강", "color_depth": "진함", "weight_g": 155, "soil_level": 2, "is_new": true, "wash_code": "W30_MILD", "spin_code": "SPIN_MILD", "dry_code": "TUMBLE_LOW", "weight_source": ""},
  {"id": "C05", "item": "면 티셔츠", "material": "면", "color_family": "파랑", "color_depth": "진함", "weight_g": 150, "soil_level": 3, "is_new": false, "wash_code": "W40", "spin_code": "SPIN_NORMAL", "dry_code": "TUMBLE_LOW", "weight_source": ""},
  {"id": "C06", "item": "반팔 셔츠", "material": "혼방", "color_family": "흰", "color_depth": "연함", "weight_g": 200, "soil_level": 2, "is_new": false, "wash_code": "W40", "spin_code": "SPIN_MILD", "dry_code": "TUMBLE_LOW", "weight_source": ""},
  {"id": "C07", "item": "긴팔 셔츠", "material": "면", "color_family": "흰", "color_depth": "연함", "weight_g": 220, "soil_level": 3, "is_new": false, "wash_code": "W40", "spin_code": "SPIN_MILD", "dry_code": "TUMBLE_LOW", "weight_source": ""},
  {"id": "C08", "item": "긴팔 셔츠", "material": "면", "color_family": "파랑", "color_depth": "중간", "weight_g": 220, "soil_level": 2, "is_new": false, "wash_code": "W40", "spin_code": "SPIN_MILD", "dry_code": "TUMBLE_LOW", "weight_source": ""},
  {"id": "C09", "item": "정장 셔츠", "material": "혼방", "color_family": "흰", "color_depth": "연함", "weight_g": 210, "soil_level": 1, "is_new": false, "wash_code": "W30_MILD", "spin_code": "SPIN_MILD", "dry_code": "HANG", "weight_source": ""},
  {"id": "C10", "item": "청바지", "material": "면", "color_family": "파랑", "color_depth": "진함", "weight_g": 650, "soil_level": 3, "is_new": true, "wash_code": "W30_MILD", "spin_code": "SPIN_MILD", "dry_code": "TUMBLE_LOW", "weight_source": ""},
  {"id": "C11", "item": "청바지", "material": "면", "color_family": "파랑", "color_depth": "진함", "weight_g": 620, "soil_level": 4, "is_new": false, "wash_code": "W40", "spin_code": "SPIN_NORMAL", "dry_code": "TUMBLE_LOW", "weight_source": ""},
  {"id": "C12", "item": "면바지", "material": "면", "color_family": "검정", "color_depth": "진함", "weight_g": 450, "soil_level": 3, "is_new": false, "wash_code": "W40", "spin_code": "SPIN_NORMAL", "dry_code": "TUMBLE_LOW", "weight_source": ""},
  {"id": "C13", "item": "면바지", "material": "면", "color_family": "베이지", "color_depth": "연함", "weight_g": 430, "soil_level": 2, "is_new": false, "wash_code": "W40", "spin_code": "SPIN_NORMAL", "dry_code": "TUMBLE_LOW", "weight_source": ""},
  {"id": "C14", "item": "반바지", "material": "면", "color_family": "검정", "color_depth": "진함", "weight_g": 250, "soil_level": 3, "is_new": false, "wash_code": "W40", "spin_code": "SPIN_NORMAL", "dry_code": "TUMBLE_LOW", "weight_source": ""},
  {"id": "C15", "item": "후드 티셔츠", "material": "혼방", "color_family": "회색", "color_depth": "중간", "weight_g": 550, "soil_level": 3, "is_new": false, "wash_code": "W40", "spin_code": "SPIN_NORMAL", "dry_code": "TUMBLE_LOW", "weight_source": ""},
  {"id": "C16", "item": "후드 티셔츠", "material": "혼방", "color_family": "검정", "color_depth": "진함", "weight_g": 570, "soil_level": 2, "is_new": false, "wash_code": "W40", "spin_code": "SPIN_NORMAL", "dry_code": "TUMBLE_LOW", "weight_source": ""},
  {"id": "C17", "item": "맨투맨", "material": "혼방", "color_family": "남색", "color_depth": "진함", "weight_g": 480, "soil_level": 3, "is_new": false, "wash_code": "W40", "spin_code": "SPIN_NORMAL", "dry_code": "TUMBLE_LOW", "weight_source": ""},
  {"id": "C18", "item": "울 스웨터", "material": "울", "color_family": "회색", "color_depth": "중간", "weight_g": 400, "soil_level": 1, "is_new": false, "wash_code": "HAND", "spin_code": "SPIN_NO", "dry_code": "FLAT_SHADE", "weight_source": ""},
  {"id": "C19", "item": "울 스웨터", "material": "울", "color_family": "빨강", "color_depth": "진함", "weight_g": 420, "soil_level": 1, "is_new": true, "wash_code": "HAND", "spin_code": "SPIN_NO", "dry_code": "FLAT_SHADE", "weight_source": ""},
  {"id": "C20", "item": "니트 가디건", "material": "울", "color_family": "베이지", "color_depth": "연함", "weight_g": 380, "soil_level": 1, "is_new": false, "wash_code": "HAND", "spin_code": "SPIN_NO", "dry_code": "FLAT_SHADE", "weight_source": ""},
  {"id": "C21", "item": "니트 조끼", "material": "울", "color_family": "남색", "color_depth": "진함", "weight_g": 300, "soil_level": 1, "is_new": false, "wash_code": "NO_WASH", "spin_code": "SPIN_NO", "dry_code": "FLAT_SHADE", "weight_source": ""},
  {"id": "C22", "item": "운동복 상의", "material": "합성", "color_family": "검정", "color_depth": "진함", "weight_g": 180, "soil_level": 4, "is_new": false, "wash_code": "W40", "spin_code": "SPIN_NORMAL", "dry_code": "TUMBLE_LOW", "weight_source": ""},
  {"id": "C23", "item": "운동복 상의", "material": "합성", "color_family": "흰", "color_depth": "연함", "weight_g": 175, "soil_level": 4, "is_new": false, "wash_code": "W40", "spin_code": "SPIN_NORMAL", "dry_code": "TUMBLE_LOW", "weight_source": ""},
  {"id": "C24", "item": "운동복 하의", "material": "합성", "color_family": "검정", "color_depth": "진함", "weight_g": 260, "soil_level": 4, "is_new": false, "wash_code": "W40", "spin_code": "SPIN_NORMAL", "dry_code": "TUMBLE_LOW", "weight_source": ""},
  {"id": "C25", "item": "기능성 티셔츠", "material": "합성", "color_family": "파랑", "color_depth": "중간", "weight_g": 140, "soil_level": 5, "is_new": false, "wash_code": "W30_MILD", "spin_code": "SPIN_MILD", "dry_code": "HANG_SHADE", "weight_source": ""},
  {"id": "C26", "item": "바람막이", "material": "합성", "color_family": "남색", "color_depth": "진함", "weight_g": 350, "soil_level": 2, "is_new": false, "wash_code": "W30_MILD", "spin_code": "SPIN_MILD", "dry_code": "HANG_SHADE", "weight_source": ""},
  {"id": "C27", "item": "잠옷 상의", "material": "면", "color_family": "회색", "color_depth": "연함", "weight_g": 180, "soil_level": 2, "is_new": false, "wash_code": "W40", "spin_code": "SPIN_NORMAL", "dry_code": "TUMBLE_LOW", "weight_source": ""},
  {"id": "C28", "item": "잠옷 하의", "material": "면", "color_family": "회색", "color_depth": "연함", "weight_g": 200, "soil_level": 2, "is_new": false, "wash_code": "W40", "spin_code": "SPIN_NORMAL", "dry_code": "TUMBLE_LOW", "weight_source": ""},
  {"id": "C29", "item": "속옷", "material": "면", "color_family": "흰", "color_depth": "연함", "weight_g": 60, "soil_level": 3, "is_new": false, "wash_code": "W60", "spin_code": "SPIN_NORMAL", "dry_code": "TUMBLE_LOW", "weight_source": ""},
  {"id": "C30", "item": "속옷", "material": "면", "color_family": "흰", "color_depth": "연함", "weight_g": 60, "soil_level": 3, "is_new": false, "wash_code": "W60", "spin_code": "SPIN_NORMAL", "dry_code": "TUMBLE_LOW", "weight_source": ""},
  {"id": "C31", "item": "속옷", "material": "면", "color_family": "회색", "color_depth": "중간", "weight_g": 60, "soil_level": 3, "is_new": false, "wash_code": "W40", "spin_code": "SPIN_NORMAL", "dry_code": "TUMBLE_LOW", "weight_source": ""},
  {"id": "C32", "item": "양말", "material": "혼방", "color_family": "흰", "color_depth": "연함", "weight_g": 50, "soil_level": 4, "is_new": false, "wash_code": "W60", "spin_code": "SPIN_NORMAL", "dry_code": "TUMBLE_NORMAL", "weight_source": ""},
  {"id": "C33", "item": "양말", "material": "혼방", "color_family": "검정", "color_depth": "진함", "weight_g": 50, "soil_level": 4, "is_new": false, "wash_code": "W40", "spin_code": "SPIN_NORMAL", "dry_code": "TUMBLE_NORMAL", "weight_source": ""},
  {"id": "C34", "item": "양말", "material": "혼방", "color_family": "검정", "color_depth": "진함", "weight_g": 50, "soil_level": 5, "is_new": false, "wash_code": "W40", "spin_code": "SPIN_NORMAL", "dry_code": "TUMBLE_NORMAL", "weight_source": ""},
  {"id": "C35", "item": "수건 (중)", "material": "면", "color_family": "흰", "color_depth": "연함", "weight_g": 250, "soil_level": 3, "is_new": false, "wash_code": "W95", "spin_code": "SPIN_NORMAL", "dry_code": "TUMBLE_NORMAL", "weight_source": ""},
  {"id": "C36", "item": "수건 (중)", "material": "면", "color_family": "흰", "color_depth": "연함", "weight_g": 250, "soil_level": 3, "is_new": false, "wash_code": "W95", "spin_code": "SPIN_NORMAL", "dry_code": "TUMBLE_NORMAL", "weight_source": ""},
  {"id": "C37", "item": "수건 (중)", "material": "면", "color_family": "파랑", "color_depth": "중간", "weight_g": 255, "soil_level": 3, "is_new": false, "wash_code": "W60", "spin_code": "SPIN_NORMAL", "dry_code": "TUMBLE_NORMAL", "weight_source": ""},
  {"id": "C38", "item": "목욕 수건", "material": "면", "color_family": "흰", "color_depth": "연함", "weight_g": 500, "soil_level": 3, "is_new": false, "wash_code": "W95", "spin_code": "SPIN_NORMAL", "dry_code": "TUMBLE_NORMAL", "weight_source": ""},
  {"id": "C39", "item": "베갯잇", "material": "면", "color_family": "흰", "color_depth": "연함", "weight_g": 150, "soil_level": 2, "is_new": false, "wash_code": "W60", "spin_code": "SPIN_NORMAL", "dry_code": "TUMBLE_NORMAL", "weight_source": ""},
  {"id": "C40", "item": "이불 커버", "material": "면", "color_family": "흰", "color_depth": "연함", "weight_g": 900, "soil_level": 2, "is_new": false, "wash_code": "W60", "spin_code": "SPIN_NORMAL", "dry_code": "TUMBLE_NORMAL", "weight_source": ""},
  {"id": "C41", "item": "에코백", "material": "면", "color_family": "베이지", "color_depth": "연함", "weight_g": 180, "soil_level": 2, "is_new": false, "wash_code": "W40", "spin_code": "SPIN_NORMAL", "dry_code": "HANG", "weight_source": ""},
  {"id": "C42", "item": "모자", "material": "면", "color_family": "검정", "color_depth": "진함", "weight_g": 100, "soil_level": 3, "is_new": false, "wash_code": "HAND", "spin_code": "SPIN_NO", "dry_code": "FLAT_SHADE", "weight_source": ""}
];

// 코드에서 쓰기 편하도록 분류별로 나눠 둔 것
const WASH_BY_CODE = {};
WASH_SYMBOLS.forEach(s => { WASH_BY_CODE[s.code] = s; });
const WASH_OPTIONS = WASH_SYMBOLS.filter(s => s.category === 'wash');
const SPIN_OPTIONS = WASH_SYMBOLS.filter(s => s.category === 'spin');
const DRY_OPTIONS  = WASH_SYMBOLS.filter(s => s.category === 'dry');
