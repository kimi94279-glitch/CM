// 앱 전역 설정 값

// 딥링크 스킴 (app.json 의 scheme 과 일치해야 한다)
export const APP_SCHEME = 'couplemap';

// 초대 웹 페이지 — 앱이 없는 상대도 여는 링크. web/invite/ 를 GitHub Pages 로 배포한다.
// 페이지가 "앱에서 열기"(couplemap://invite?token=…)와 코드 복사를 함께 보여준다.
export const INVITE_WEB_URL = 'https://kimi94279-glitch.github.io/CM/invite/';

// 초대 코드 유효 시간 (시간 단위)
export const INVITE_EXPIRY_HOURS = 48;

// 초대 코드 길이
export const INVITE_TOKEN_LENGTH = 8;

// 장소 찾기 보조(카카오 로컬 검색) — ADR-016 Option C.
// 검색 결과는 화면에만 보여 주고 저장하지 않는다. 결과를 고르면 지도를 그 자리로 옮기고,
// 사용자가 핀 위치·이름을 확정한 것만 저장한다. 카카오 장소 ID 는 "카카오맵에서 보기" 링크용으로만 둔다.
// 카카오 공식 회신에서 허용되지 않으면 false → 검색 없이 "직접 핀 찍기"만 남는다.
export const KAKAO_SEARCH_ASSIST = true;

// 장소 한 줄 메모(말풍선) 최대 길이. DB 는 길이 제약이 없고 입력에서만 제한한다.
export const MEMO_MAX_LENGTH = 40;
