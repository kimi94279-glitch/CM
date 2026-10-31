// DESIGN.md 의 컬러/타이포/스페이싱 토큰.
// 2026-10-31 "AI 티 빼기": 색과 글자를 20세기 인쇄 지도의 세계에서 가져온다(DESIGN.md §디자인 원칙 v2).
//   - 틀(종이·먹·괘선)은 지도 종이와 인쇄 먹. 크림+세리프+테라코타(흔한 AI 룩)는 피한다.
//   - 글꼴은 시스템 글꼴 하나. 꾸밈 글꼴(둥근 한글 글꼴)은 쓰지 않는다.
//   - 사람의 색(잉크)은 인쇄 잉크 6색. 이름(키)은 DB CHECK 와 같아야 해서 그대로 두고 색값만 바꿨다.

// 잉크 = 한 사람의 색.
// solid: 핀·점·테두리(흰 글자 대비 4.5:1 이상) / soft: 펜 선·연한 장식 / text: 흰 바탕 위 글자 / tint: 선택 배경
export interface Ink {
  solid: string;
  soft: string;
  text: string;
  tint: string;
}

// 잉크 팔레트 6색 — 각자 고른다(users.ink, 0012). 지도에서 나·지금 상대는 각자의 잉크(같으면 상대를 다음 색으로),
// 예전 상대·떠난 사람은 inkOther(흑연). 이름은 DB CHECK(users_ink_check)와 같아야 한다.
export const inks = {
  peach: { solid: '#C2421C', soft: '#F2A483', text: '#A33616', tint: '#FCEBE3' }, // 주홍
  sky: { solid: '#21479B', soft: '#93AEE0', text: '#1B3B80', tint: '#E7EDF9' }, // 군청
  mint: { solid: '#3A6B34', soft: '#A4CD98', text: '#2E5629', tint: '#E9F2E5' }, // 쑥
  butter: { solid: '#8C5E0E', soft: '#E6C473', text: '#744D0B', tint: '#F8EFD9' }, // 황토
  lilac: { solid: '#7E3584', soft: '#D1A2D3', text: '#672B6C', tint: '#F4E6F4' }, // 자주
  rose: { solid: '#B4335F', soft: '#EDA3BC', text: '#952A4F', tint: '#FBE7EE' }, // 분홍
} as const satisfies Record<string, Ink>;

export type InkName = keyof typeof inks;
// 기본 잉크는 DB 기본값(users.ink default 'lilac', 0012)과 같아야 한다 — 다르면 프로필을 읽기 전후로 핀 색이 깜빡인다.
// 둘 다 안 고르면 상대는 순서상 다음 색: 자주 다음이 주홍이라 기본 한 쌍은 자주·주홍(보라와 주황, 확실히 갈림).
export const INK_ORDER: InkName[] = ['lilac', 'peach', 'sky', 'mint', 'butter', 'rose'];
export const DEFAULT_INK: InkName = 'lilac';
export const DEFAULT_PARTNER_INK: InkName = 'peach';
export const inkLabels: Record<InkName, string> = {
  lilac: '자주',
  peach: '주홍',
  sky: '군청',
  mint: '쑥',
  butter: '황토',
  rose: '분홍',
};

// 예전 상대·탈퇴한 사람의 흔적(누구인지 지금 공간에서 알 수 없음) — 흑연
export const inkOther: Ink = {
  solid: '#5E5A52',
  soft: '#C2BCB0',
  text: '#5E5A52',
  tint: '#EFEBE3',
};

export const colors = {
  // 틀: 지도 종이와 인쇄 먹
  bg: '#FAF7F0', // 지도 종이
  surface: '#FFFFFF', // 종이 위에 놓인 카드·시트
  surfaceMuted: '#F1ECE1', // 입력칸·보조 버튼(종이를 한 번 더 접은 면)
  textStrong: '#1C1C1A', // 인쇄 먹
  textMuted: '#5E5A52', // 흐린 먹(4.5:1 이상)
  textFaint: '#8A8478', // 자리 글자·꺼진 것(장식용 — 본문에 쓰지 않는다)
  border: '#DCD5C6', // 괘선
  // 주요 액션 = 군청(인쇄 지도의 물·글자 색). 이름은 기존 사용처 호환을 위해 primary 유지.
  primary: '#1F3A7A',
  onPrimary: '#FFFFFF',
  primarySoft: '#E7EDF9',
  // 지도 세계의 강조색 — 도로지도 빨강(소인·접기·표지 띠), 노랑(형광펜), 꼬리표 종이
  roadRed: '#C6252D',
  roadYellow: '#F5C400',
  tag: '#FFFBF2',
  tagRule: '#E3D6BD',
  tagInk: '#3A2F22',
  // 지도 동선 — 지금은 쓰지 않음(핀 사이 자동 선 없음)
  route: '#8A8478',
  // 사람별 잉크(기본값 — DEFAULT_INK·DEFAULT_PARTNER_INK)
  you: inks.lilac.solid,
  youSoft: inks.lilac.soft,
  youText: inks.lilac.text,
  youTint: inks.lilac.tint,
  partner: inks.peach.solid,
  partnerSoft: inks.peach.soft,
  partnerText: inks.peach.text,
  partnerTint: inks.peach.tint,
  // 상태 표시 전용(글자로도 쓰이므로 흰 바탕 대비 4.5:1 이상)
  success: '#2E6B2A',
  warning: '#8C5E0E',
  danger: '#B42318',
} as const;

// 소셜 로그인 버튼 — 각 서비스 디자인 가이드가 정한 색. Apple 은 시스템 버튼을 쓴다.
export const providerColors = {
  kakao: '#FEE500',
  kakaoText: 'rgba(0, 0, 0, 0.85)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

// 재질별 둥글기: 꼬리표·쪽지(종이 끝) 4 / 입력칸·버튼 10 / 시트·카드 16 / 동그란 버튼 22
export const radius = {
  tag: 4,
  field: 10,
  button: 10,
  card: 16,
  round: 22,
} as const;

// 그림자 두 단: 종이에 놓인 것(낮게, 거의 붙어 있음) · 떠 있는 판(시트·필통). 먹빛 그림자(순검정 아님).
export const shadows = {
  paper: {
    shadowColor: '#3A2E1C',
    shadowOpacity: 0.18,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  lifted: {
    shadowColor: '#3A2E1C',
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
} as const;

// 글꼴: 시스템 글꼴 한 가지(iOS 애플 SD 산돌고딕 Neo · 안드로이드 기본 고딕). 꾸밈 글꼴을 따로 쓰지 않는다 —
// 둥근 한글 글꼴(주아·고운돋움 등)은 "따뜻한 한글 디자인"을 만들 때 AI가 가장 먼저 고르는 글꼴이라 그 자체로 티가 난다(2026-10-31).
// 표현은 글꼴이 아니라 지도(인쇄 지도의 굵은 고딕 지명)와 사람이 직접 그은 선이 맡는다. 기기 글자 크기 설정을 따른다.
// 한글은 줄 간격을 넉넉히(약 1.4배).
export const typography = {
  display: { fontSize: 28, lineHeight: 36, fontWeight: '800' as const },
  title: { fontSize: 20, lineHeight: 27, fontWeight: '700' as const },
  body: { fontSize: 16, lineHeight: 23, fontWeight: '400' as const },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600' as const },
  caption: { fontSize: 12, lineHeight: 17, fontWeight: '400' as const },
} as const;

// 숫자 폭 고정(개수·시간·날짜·버전·초대 코드). 값이 바뀌어도 글자가 옆으로 흔들리지 않게 — 시스템 글꼴 기능이라 새 글꼴이 필요 없다.
export const numeric = { fontVariant: ['tabular-nums'] as 'tabular-nums'[] };
