import * as Crypto from 'expo-crypto';

import { INVITE_TOKEN_LENGTH, INVITE_WEB_URL } from '../constants/config';

// 혼동되기 쉬운 문자(0/O/1/I/L) 제외
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_RE = new RegExp(`^[${ALPHABET}]{${INVITE_TOKEN_LENGTH}}$`);
const HALF = INVITE_TOKEN_LENGTH / 2;
const LOOSE_CODE_RE = new RegExp(
  `(?:^|[^A-Z0-9])([${ALPHABET}]{${HALF}})\\s?([${ALPHABET}]{${HALF}})(?![A-Z0-9])`
);

// 사람이 입력 가능한 초대 토큰(코드) 생성
export async function generateInviteToken(length = INVITE_TOKEN_LENGTH): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

// 공유용 초대 링크 — 웹 페이지라 앱이 없어도 열린다.
// 페이지(web/invite/)가 앱 딥링크(`${APP_SCHEME}://invite?token=…`)와 코드를 함께 보여준다.
export function buildInviteLink(token: string): string {
  return `${INVITE_WEB_URL}?code=${token}`;
}

// 표시용 코드 포맷 (4자리씩 띄움): ABCD EFGH
export function formatInviteCode(token: string): string {
  return token.replace(/(.{4})/g, '$1 ').trim();
}

// 사용자 입력 코드 정규화 (공백 제거 + 대문자)
export function normalizeInviteCode(input: string): string {
  return input.replace(/\s+/g, '').toUpperCase();
}

// 형식이 맞는 코드면 정규화해서, 아니면 null
function toInviteCode(raw: string): string | null {
  const code = normalizeInviteCode(raw);
  return CODE_RE.test(code) ? code : null;
}

// 앱을 연 URL 에서 초대 코드 추출.
// couplemap://invite?token=… (앱 딥링크) · https://…/invite/?code=… (웹 페이지 주소) 둘 다 받는다.
export function parseInviteUrl(url: string): string | null {
  if (!/:\/\/(?:[^?#]*\/)?invite\/?(?:[?#]|$)/i.test(url)) return null;
  const m = url.match(/[?&](?:token|code)=([^&#]+)/);
  return m ? toInviteCode(decodeURIComponent(m[1])) : null;
}

// 붙여넣은 글에서 초대 코드 찾기 — 공유 메시지 전체를 붙여넣어도 링크나 코드에서 찾아낸다.
export function extractInviteCode(text: string): string | null {
  const fromLink = text.match(/[?&](?:token|code)=([A-Za-z0-9]+)/);
  if (fromLink) return toInviteCode(fromLink[1]);
  const loose = text.toUpperCase().match(LOOSE_CODE_RE);
  return loose ? loose[1] + loose[2] : null;
}
