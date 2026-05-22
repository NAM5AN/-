/* ============================================
   sample-data.js
   - 게스트 모드(둘러보기)에서 보여줄 샘플 체험단 데이터
   - 오늘 날짜 기준 상대적으로 마감일이 계산됨
   - AI 추출 시뮬레이션용 가짜 결과도 포함
   ============================================ */

// 오늘로부터 N일 뒤의 YYYY-MM-DD 문자열 반환
function dateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// 오늘로부터 N일 뒤의 ISO timestamp 반환 (created_at, completed_at용)
function timeOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

// 게스트 모드 진입 시 화면을 채울 샘플 체험단 7개
// 의도된 다양성:
//  - 카테고리: 카페/스시/피부과/한우/마사지/베이커리/바
//  - 지역 표기: 실제 공고처럼 패턴이 제각각 (시+동네/지역명만/역+도보/구만 등)
//  - D-day: 마감 지남/D-2/D-9/D-17/D-22/D-27
//  - 방문 예정: 오늘/미래/미정
//  - 상태: 진행중 6개 + 완료 1개
window.GUEST_SAMPLE_ENTRIES = [
  {
    id: 'guest-sample-1',
    storeName: '로컬 라떼',
    region: '서울 강남',
    content: '시그니처 라떼 + 시즌 디저트 2종 무료 제공',
    deadline: dateOffset(2),
    visitDate: dateOffset(0),
    memo: '친구랑 함께 방문 예정 · 7시 예약',
    lat: 37.4979,
    lng: 127.0276,
    locationSource: 'kakao',
    actualAddress: '서울 강남구 강남대로 396',
    category: '음식점 > 카페 > 테이크아웃',
    completed: false,
    completedAt: '',
    createdAt: timeOffset(-3)
  },
  {
    id: 'guest-sample-2',
    storeName: '이로재 스시',
    region: '종로',
    content: '오마카세 디너 코스 (4만원 상당)',
    deadline: dateOffset(9),
    visitDate: dateOffset(3),
    memo: '예약 시 "체험단" 언급 필수',
    lat: 37.5735,
    lng: 126.9789,
    locationSource: 'kakao',
    actualAddress: '서울 종로구 인사동길 12',
    category: '음식점 > 일식 > 초밥',
    completed: false,
    completedAt: '',
    createdAt: timeOffset(-2)
  },
  {
    id: 'guest-sample-3',
    storeName: '샤이닝 더마',
    region: '압구정역 5분',
    content: 'MTS 시술 1회 + 진정 케어',
    deadline: dateOffset(17),
    visitDate: dateOffset(11),
    memo: '',
    lat: 37.5273,
    lng: 127.0286,
    locationSource: 'kakao',
    actualAddress: '서울 강남구 압구정로 165',
    category: '의료,건강 > 병원 > 피부과',
    completed: false,
    completedAt: '',
    createdAt: timeOffset(-1)
  },
  {
    id: 'guest-sample-4',
    storeName: '한우 정담',
    region: '마포구',
    content: '1++ 한우 디너 (3-4인 기준)',
    deadline: dateOffset(22),
    visitDate: '',
    memo: '주말 방문 가능한지 확인 필요',
    lat: 37.5563,
    lng: 126.9226,
    locationSource: 'kakao',
    actualAddress: '서울 마포구 와우산로 94',
    category: '음식점 > 한식 > 육류,고기',
    completed: false,
    completedAt: '',
    createdAt: timeOffset(-1)
  },
  {
    id: 'guest-sample-5',
    storeName: '휴 마사지',
    region: '신촌',
    content: '전신 아로마 마사지 90분',
    deadline: dateOffset(27),
    visitDate: '',
    memo: '',
    lat: 37.5588,
    lng: 126.9425,
    locationSource: 'kakao',
    actualAddress: '서울 서대문구 신촌로 73',
    category: '가정,생활 > 마사지,발마사지',
    completed: false,
    completedAt: '',
    createdAt: timeOffset(0)
  },
  {
    id: 'guest-sample-6',
    storeName: '봄꽃 베이커리',
    region: '이태원',
    content: '시즌 디저트 박스 (6개입)',
    deadline: dateOffset(-3),
    visitDate: dateOffset(-7),
    memo: '리뷰 잘 작성됨 · 좋은 사장님',
    lat: 37.5346,
    lng: 126.9947,
    locationSource: 'kakao',
    actualAddress: '서울 용산구 이태원로 200',
    category: '음식점 > 베이커리',
    completed: true,
    completedAt: timeOffset(-5),
    createdAt: timeOffset(-14)
  },
  {
    id: 'guest-sample-7',
    storeName: '루프탑 바 야경',
    region: '서울',
    content: '시그니처 칵테일 2잔 + 안주 1종',
    deadline: dateOffset(-4),
    visitDate: dateOffset(-6),
    memo: '⚠️ 마감 놓침 — 다음엔 알림 켜두기',
    lat: 37.5346,
    lng: 127.0046,
    locationSource: 'kakao',
    actualAddress: '서울 용산구 한남대로 152',
    category: '음식점 > 술집 > 칵테일바',
    completed: false,
    completedAt: '',
    createdAt: timeOffset(-12)
  }
];

// AI 추출 시뮬레이션용 가짜 결과
// 게스트 모드에서 이미지 업로드 시 실제 API 호출 없이 이 결과 중 하나를 보여줌
// 지역 표기는 실제 AI 추출처럼 짧고 모호하게 (작성자마다 다른 현실 반영)
window.GUEST_AI_DEMO_RESULTS = [
  {
    storeName: '미니멀 카페',
    region: '마포',
    content: '시즌 한정 라떼 + 디저트 1종 무료 시식',
    deadline: dateOffset(14)
  },
  {
    storeName: '글로우 스킨 클리닉',
    region: '강남',
    content: '리쥬란 힐러 시술 1회 (기본 부위)',
    deadline: dateOffset(20)
  },
  {
    storeName: '오븐 도우 베이커리',
    region: '서울',
    content: '시즌 빵 박스 (8가지 모음)',
    deadline: dateOffset(10)
  }
];
