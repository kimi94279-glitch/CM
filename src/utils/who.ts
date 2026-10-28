// 흔적의 작성자 구분: 나 · 지금 같이 그리는 사람 · 그 밖(예전 상대·탈퇴해 작성자 없음)
export type Who = 'me' | 'partner' | 'other';

export function whoOf(
  userId: string | null | undefined,
  myId: string | null,
  partnerId: string | null
): Who {
  if (userId && myId && userId === myId) return 'me';
  if (userId && partnerId && userId === partnerId) return 'partner';
  return 'other';
}
