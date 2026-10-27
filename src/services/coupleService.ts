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

// 연결 끊기 (leave_workspace RPC, 0010): 나만 빠지고, 함께 쓰던 지도는 상대가 혼자 쓰는 공간으로 갖는다.
export async function leaveWorkspace(): Promise<void> {
  const { error } = await supabase.rpc('leave_workspace');
  if (error) throw error;
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
// 수락자가 혼자 그리던 보드가 있으면 함께 쓰는 공간으로 옮겨진다(0008).
export async function acceptInvite(token: string): Promise<Couple> {
  const { data, error } = await supabase.rpc('accept_invite', { token });
  if (error) throw error;
  return data as Couple;
}

// 수락 전 미리보기 (invite_preview RPC, 0008)
export type InvitePreviewState = 'ok' | 'invalid' | 'used' | 'expired' | 'own' | 'taken';
export interface InvitePreview {
  state: InvitePreviewState;
  inviter_name: string | null;
}

export async function getInvitePreview(token: string): Promise<InvitePreview> {
  const { data, error } = await supabase.rpc('invite_preview', { token });
  if (error) throw error;
  return data as InvitePreview;
}

// 미리보기 상태별 안내 (ok 는 화면에서 따로 그린다)
export function describeInvitePreview(preview: InvitePreview): string | null {
  const name = preview.inviter_name ?? '초대한 사람';
  switch (preview.state) {
    case 'invalid':
      return '없는 초대 코드예요. 한 번 더 확인해 주세요.';
    case 'used':
      return '이미 쓰인 초대예요. 새 초대를 받아 주세요.';
    case 'expired':
      return `${name}님의 초대가 만료됐어요. 새 초대를 받아 주세요.`;
    case 'own':
      return '내가 만든 초대예요. 같이 그릴 사람에게 보내 주세요.';
    case 'taken':
      return `${name}님은 이미 다른 사람과 같이 그리고 있어요.`;
    default:
      return null;
  }
}

// accept_invite RPC 가 던지는 예외 메시지를 사용자 메시지로 매핑 (FLOW_AUTH.md)
export function mapAcceptInviteError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('login required')) return '같이 그리려면 로그인이 필요해요.';
  if (message.includes('invalid invite')) return '없는 초대 코드예요. 한 번 더 확인해 주세요.';
  if (message.includes('already used')) return '이미 쓰인 초대예요. 새 초대를 받아 주세요.';
  if (message.includes('expired')) return '만료된 초대예요. 새 초대를 받아 주세요.';
  if (message.includes('own invite')) return '내가 만든 초대예요. 같이 그릴 사람에게 보내 주세요.';
  if (message.includes('already in an active couple')) return '이미 같이 그리는 사람이 있어요.';
  if (message.includes('inviter already coupled'))
    return '초대한 사람이 이미 다른 사람과 같이 그리고 있어요.';
  return '연결하지 못했어요. 잠시 후 다시 시도해 주세요.';
}
