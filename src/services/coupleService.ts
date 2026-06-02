import { INVITE_EXPIRY_HOURS } from '../constants/config';
import type { Couple, CoupleInvite } from '../types/models';
import { generateInviteToken } from '../utils/invite';
import { supabase } from './supabase';

// 내 워크스페이스 조회 (solo 또는 active). RLS 로 본인 워크스페이스만 조회됨. 없으면 null
export async function getMyWorkspace(): Promise<Couple | null> {
  const { data, error } = await supabase
    .from('couples')
    .select('*')
    .in('status', ['solo', 'active'])
    .maybeSingle();
  if (error) throw error;
  return data;
}

// 솔로 워크스페이스 생성 ("먼저 둘러보기"). create_solo_workspace RPC 호출
export async function createSoloWorkspace(): Promise<Couple> {
  const { data, error } = await supabase.rpc('create_solo_workspace');
  if (error) throw error;
  return data as Couple;
}

// 초대 생성: couple_invites 행 삽입 (이 시점에 couple 은 생성되지 않음 - DATABASE.md)
export async function createInvite(): Promise<CoupleInvite> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const uid = userData.user?.id;
  if (!uid) throw new Error('인증된 사용자가 없습니다.');

  const token = await generateInviteToken();
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('couple_invites')
    .insert({ invite_token: token, created_by: uid, expires_at: expiresAt })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// 초대 수락: accept_invite RPC 호출 (커플 생성의 유일한 경로 - DATABASE.md)
export async function acceptInvite(token: string): Promise<Couple> {
  const { data, error } = await supabase.rpc('accept_invite', { token });
  if (error) throw error;
  return data as Couple;
}

// accept_invite RPC 가 던지는 예외 메시지를 사용자 메시지로 매핑 (FLOW_AUTH.md)
export function mapAcceptInviteError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('invalid invite')) return '유효하지 않은 초대예요.';
  if (message.includes('already used')) return '이미 사용된 초대예요.';
  if (message.includes('expired')) return '만료된 초대예요. 새 초대를 요청해주세요.';
  if (message.includes('own invite')) return '본인 초대는 수락할 수 없어요.';
  if (message.includes('already in an active couple')) return '이미 연결된 계정이 있어요.';
  if (message.includes('inviter already coupled')) return '상대가 이미 다른 연결을 가지고 있어요.';
  if (message.includes('acceptor has solo data'))
    return '내 계획이 이미 있어 합칠 수 없어요. (병합은 추후 지원 예정)';
  return '연결에 실패했어요. 잠시 후 다시 시도해주세요.';
}
