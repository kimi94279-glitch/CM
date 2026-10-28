// DESIGN.md 의 컬러/타이포/스페이싱 토큰 (최소 범위)
// B+ (2026-10-25): 틀은 무채색, 색은 사람이 그린 잉크에만. 브랜드 색은 여러 잉크가 섞인 로고에만 쓴다.

// 잉크 = 한 사람의 색.
// solid: 핀·점·테두리(흰 글자 대비 4.5:1 이상) / soft: 펜 선·연한 장식 / text: 흰 바탕 위 글자 / tint: 선택 배경
export interface Ink {
  solid: string;
  soft: string;
  text: string;
  tint: string;
}

// 잉크 팔레트 6색 — 각자 고른다(users.ink, 0012). 지도에서 나·지금 상대는 각자의 잉크(같으면 상대를 다음 색으로),
// 예전 상대·떠난 사람은 inkOther(회색). 이름은 DB CHECK(users_ink_check)와 같아야 한다.
export const inks = {
  lilac: { solid: '#6F5DD8', soft: '#B9AAF5', text: '#4A3BB0', tint: '#F1EEFD' },
  sky: { solid: '#2F78BC', soft: '#9CCBF2', text: '#1F5E99', tint: '#EAF4FD' },
  mint: { solid: '#2A7F5E', soft: '#A7E3C9', text: '#1E6B4D', tint: '#E9F7F0' },
  butter: { solid: '#8C6A0E', soft: '#F6D98B', text: '#7A5C0A', tint: '#FDF6E3' },
  peach: { solid: '#B5502F', soft: '#F7B9A6', text: '#9A3F25', tint: '#FDEFEA' },
  rose: { solid: '#C04A82', soft: '#F2B6D2', text: '#953563', tint: '#FCEEF5' },
} as const satisfies Record<string, Ink>;

export type InkName = keyof typeof inks;
export const INK_ORDER: InkName[] = ['lilac', 'sky', 'mint', 'butter', 'peach', 'rose'];
export const DEFAULT_INK: InkName = 'lilac';
export const inkLabels: Record<InkName, string> = {
  lilac: '라일락',
  sky: '하늘',
  mint: '민트',
  butter: '버터',
  peach: '복숭아',
  rose: '장미',
};

// 예전 상대·탈퇴한 사람의 흔적(누구인지 지금 공간에서 알 수 없음) — 무채색
export const inkOther: Ink = {
  solid: '#6E6E73',
  soft: '#C7C7CC',
  text: '#6E6E73',
  tint: '#F2F2F7',
};

export const colors = {
  // 틀(무채색)
  bg: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceMuted: '#F2F2F7', // 입력창·보조 버튼·선택 배경
  textStrong: '#1D1D1F',
  textMuted: '#6E6E73',
  border: '#E5E5EA',
  // 주요 액션 = 검정 채움(브랜드 색 아님). 기존 사용처 호환을 위해 이름은 primary 유지.
  primary: '#1D1D1F',
  onPrimary: '#FFFFFF',
  primarySoft: '#F2F2F7',
  // 지도 동선(방문 순서 연결선) — 잉크와 겹치지 않는 중립 회색
  route: '#8E8E93',
  // 사람별 잉크(지금은 고정)
  you: inks.lilac.solid,
  youSoft: inks.lilac.soft,
  youText: inks.lilac.text,
  youTint: inks.lilac.tint,
  partner: inks.sky.solid,
  partnerSoft: inks.sky.soft,
  partnerText: inks.sky.text,
  partnerTint: inks.sky.tint,
  // 상태 표시 전용(글자로도 쓰이므로 흰 바탕 대비 4.5:1 이상)
  success: '#1E7E34',
  warning: '#A15C00',
  danger: '#D93025',
} as const;

// 소셜 로그인 버튼 — 각 서비스 디자인 가이드가 정한 색(B+ 무채색 원칙의 예외). Apple 은 시스템 버튼을 쓴다.
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

export const radius = {
  field: 12,
  button: 12,
  card: 16,
} as const;

export const typography = {
  display: { fontSize: 28, fontWeight: '700' as const },
  title: { fontSize: 20, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  label: { fontSize: 14, fontWeight: '500' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
} as const;
