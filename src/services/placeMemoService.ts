import type { PlaceMemo } from '../types/models';
import { supabase } from './supabase';

// 모든 데이터 접근은 service 계층을 통해서만 수행한다. (ARCHITECTURE.md)
// 메모는 장소(places)에 종속되며, 권한은 place→board→couple 경로의 RLS 로 강제된다.
// (조회: 커플 멤버 / 작성·수정·삭제: 작성자 본인 — 0001 place_memos 정책)

// 보드의 모든 장소 메모(오래된 순). place→board 조인으로 보드 범위로 한정.
export async function listMemos(boardId: string): Promise<PlaceMemo[]> {
  const { data, error } = await supabase
    .from('place_memos')
    .select('id, place_id, user_id, content, created_at, updated_at, places!inner(board_id)')
    .eq('places.board_id', boardId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  // 조인은 보드 필터 용도 → places 필드는 버리고 PlaceMemo 형태로 정리.
  return (data ?? []).map(({ places: _places, ...m }) => m as PlaceMemo);
}

// 메모 추가 (작성자 = 본인).
export async function addMemo(placeId: string, content: string): Promise<PlaceMemo> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const uid = userData.user?.id;
  if (!uid) throw new Error('인증된 사용자가 없습니다.');

  const { data, error } = await supabase
    .from('place_memos')
    .insert({ place_id: placeId, user_id: uid, content: content.trim() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// 메모 삭제 (RLS: 작성자 본인만).
export async function removeMemo(memoId: string): Promise<void> {
  const { error } = await supabase.from('place_memos').delete().eq('id', memoId);
  if (error) throw error;
}
