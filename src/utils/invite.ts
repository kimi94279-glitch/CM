import * as Crypto from 'expo-crypto';

import { APP_SCHEME, INVITE_TOKEN_LENGTH } from '../constants/config';

// 혼동되기 쉬운 문자(0/O/1/I/L) 제외
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

// 사람이 입력 가능한 초대 토큰(코드) 생성
export async function generateInviteToken(length = INVITE_TOKEN_LENGTH): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

// 초대 딥링크 생성
export function buildInviteLink(token: string): string {
  return `${APP_SCHEME}://invite?token=${token}`;
}

// 표시용 코드 포맷 (4자리씩 띄움): ABCD EFGH
export function formatInviteCode(token: string): string {
  return token.replace(/(.{4})/g, '$1 ').trim();
}

// 사용자 입력 코드 정규화 (공백 제거 + 대문자)
export function normalizeInviteCode(input: string): string {
  return input.replace(/\s+/g, '').toUpperCase();
}
