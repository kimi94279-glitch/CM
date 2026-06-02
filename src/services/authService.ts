import type { Session } from '@supabase/supabase-js';

import type { UserProfile } from '../types/models';
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
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
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
