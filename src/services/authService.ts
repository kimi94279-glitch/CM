import type { Session } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import type { UserProfile } from '../types/models';
import { unregisterCurrentPushToken } from './pushService';
import { supabase } from './supabase';

// 모든 데이터 접근은 service 계층을 통해서만 수행한다. (ARCHITECTURE.md)

// 소셜 로그인 결과: 사용자가 로그인 창을 닫으면 'cancel' (화면은 조용히 넘어간다)
export type SocialSignInResult = 'ok' | 'cancel';

// 브라우저 로그인이 끝나고 돌아올 앱 주소(couplemap://auth/callback).
// Supabase Auth → URL Configuration → Redirect URLs 에 등록해야 한다(SUPABASE_SETUP.md §4.5).
const AUTH_REDIRECT = Linking.createURL('auth/callback');

// 카카오 로그인 — 브라우저(인앱 인증 세션)로 카카오 동의 → 돌아온 code 를 세션으로 교환(PKCE).
export async function signInWithKakao(): Promise<SocialSignInResult> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: { redirectTo: AUTH_REDIRECT, skipBrowserRedirect: true },
  });
  if (error) throw error;

  const result = await WebBrowser.openAuthSessionAsync(data.url, AUTH_REDIRECT);
  if (result.type !== 'success') return 'cancel';

  const { queryParams } = Linking.parse(result.url);
  const failure = queryParams?.error_description ?? queryParams?.error;
  if (typeof failure === 'string') throw new Error(failure);
  const code = queryParams?.code;
  if (typeof code !== 'string') throw new Error('missing auth code');

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) throw exchangeError;
  return 'ok';
}

// Apple 로그인은 iOS 에서만 (Android 는 버튼을 숨긴다)
export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  return AppleAuthentication.isAvailableAsync();
}

// Apple 로그인 — iOS 기본 창으로 ID 토큰을 받아 Supabase 세션으로 바꾼다.
// nonce: Apple 에는 해시를, Supabase 에는 원본을 넘겨 토큰 재사용을 막는다.
export async function signInWithApple(): Promise<SocialSignInResult> {
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return 'cancel';
    throw e;
  }
  if (!credential.identityToken) throw new Error('missing identity token');

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce: rawNonce,
  });
  if (error) throw error;

  // Apple 은 이름을 처음 로그인할 때만 준다 → 프로필 이름 칸을 채우도록 저장(실패해도 로그인은 유지)
  const fullName = credential.fullName
    ? AppleAuthentication.formatFullName(credential.fullName).trim()
    : '';
  if (fullName) {
    await supabase.auth.updateUser({ data: { full_name: fullName } }).catch(() => {});
  }
  return 'ok';
}

// 소셜 로그인 실패 안내
export function mapSocialSignInError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/provider is not enabled|Unsupported provider/i.test(message)) {
    return '이 로그인 방법은 아직 준비 중이에요. 이메일로 로그인해 주세요.';
  }
  return '로그인하지 못했어요. 잠시 후 다시 시도해 주세요.';
}

// 소셜 로그인으로 받은 이름(카카오 닉네임·Apple 이름) — 프로필 이름 칸 기본값
export function suggestedNickname(session: Session | null): string {
  const meta = (session?.user?.user_metadata ?? {}) as Record<string, unknown>;
  for (const key of ['nickname', 'name', 'full_name', 'preferred_username', 'user_name']) {
    const value = meta[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

export async function signUpWithEmail(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  // 이 기기 푸시 토큰부터 해제(다른 계정으로 로그인해도 이전 계정 알림이 오지 않게). 실패해도 로그아웃은 진행.
  await unregisterCurrentPushToken().catch(() => {});
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// 계정 삭제 (delete_my_account RPC, 0010) — 되돌릴 수 없다.
// 함께 쓰던 지도는 상대에게 남고, 혼자 쓰던 지도는 지워진다. 서버에서 계정이 지워지므로 이 기기 세션만 정리한다.
export async function deleteMyAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw error;
  await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const uid = data.user?.id;
  if (!uid) throw new Error('인증된 사용자가 없습니다.');
  return uid;
}

// 내 프로필 조회. 없으면 null (ProfileSetup 으로 분기)
export async function getMyProfile(): Promise<UserProfile | null> {
  const uid = await requireUserId();
  const { data, error } = await supabase.from('users').select('*').eq('id', uid).maybeSingle();
  if (error) throw error;
  return data;
}

// 다른 사용자 프로필 조회 (RLS: 본인 + 같은 워크스페이스 파트너만). 없으면 null
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

// 닉네임으로 프로필 생성 (클라이언트 방식 - FLOW_AUTH.md)
export async function createProfile(nickname: string): Promise<UserProfile> {
  const uid = await requireUserId();
  const { data, error } = await supabase
    .from('users')
    .insert({ id: uid, nickname: nickname.trim() })
    .select()
    .single();
  if (error) throw error;
  return data;
}
