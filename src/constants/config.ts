// 앱 전역 설정 값

// 딥링크 스킴 (app.json 의 scheme 과 일치해야 한다)
export const APP_SCHEME = 'couplemap';

// 초대 코드 유효 시간 (시간 단위)
export const INVITE_EXPIRY_HOURS = 48;

// 초대 코드 길이
export const INVITE_TOKEN_LENGTH = 8;

// 장소 한 줄 메모(말풍선) 최대 길이. DB 는 길이 제약이 없고 입력에서만 제한한다.
export const MEMO_MAX_LENGTH = 40;
