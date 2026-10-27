import type { Session } from '@supabase/supabase-js';

import type { UserProfile } from '../types/models';
import { unregisterCurrentPushToken } from './pushService';
import { supabase } from './supabase';

// 모든 데이터 접근은 service 계층을 통해서만 수행한다. (ARCHITECTURE.md)

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
