import { supabase } from './supabase';

// 모든 데이터 접근은 service 계층을 통해서만 수행한다. (ARCHITECTURE.md)
// 푸시 토큰은 RPC(SECURITY DEFINER)로만 등록/해제한다 — push_tokens 는 클라이언트 직접 접근 불가(0006).

// 이 기기에서 등록한 토큰(로그아웃 시 해제용). 앱을 켤 때마다 등록이 다시 돌아 채워진다.
let currentToken: string | null = null;

// 이 기기의 Expo 푸시 토큰을 내 계정에 등록(다른 계정에 있던 토큰이면 옮긴다).
export async function registerPushToken(token: string, platform: 'ios' | 'android'): Promise<void> {
  const { error } = await supabase.rpc('register_push_token', {
    p_token: token,
    p_platform: platform,
  });
  if (error) throw error;
  currentToken = token;
}

// 이 기기 토큰을 내 계정에서 해제(로그아웃 시). 등록한 적이 없으면 아무것도 하지 않는다.
export async function unregisterCurrentPushToken(): Promise<void> {
  if (!currentToken) return;
  const { error } = await supabase.rpc('unregister_push_token', { p_token: currentToken });
  if (error) throw error;
  currentToken = null;
}
