// DESIGN.md 의 컬러/타이포/스페이싱 토큰 (최소 범위)

export const colors = {
  primary: '#FF6B81',
  primarySoft: '#FFE3E8',
  you: '#FF6B81',
  partner: '#3BC9B0',
  bg: '#FFFBF7',
  surface: '#FFFFFF',
  textStrong: '#2B2B2E',
  textMuted: '#8A8A8F',
  border: '#EFE9E3',
  success: '#3BC9B0',
  warning: '#FFB020',
  danger: '#FF5A5A',
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
