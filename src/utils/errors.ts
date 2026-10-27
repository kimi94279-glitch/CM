// 사용자에게 보여줄 오류 문구.
// DB·네트워크 원문(영문 코드, SQL·RLS 메시지)은 화면에 내보내지 않고 개발 로그로만 남긴다.
export function friendlyError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (__DEV__) console.warn('[friendlyError]', message);

  if (/network request failed|failed to fetch|network ?error|timed? ?out|timeout/i.test(message)) {
    return '인터넷 연결을 확인하고 다시 시도해 주세요.';
  }
  if (
    /row-level security|permission denied|42501|jwt|not a board member|not authenticated/i.test(
      message
    )
  ) {
    return '이 지도에 대한 권한이 없어요. 앱을 다시 열어 주세요.';
  }
  return '잠시 후 다시 시도해 주세요.';
}
