import type { PlaceReaction, ReactionType } from '../types/models';
import { supabase } from './supabase';

// 모든 데이터 접근은 service 계층을 통해서만 수행한다. (ARCHITECTURE.md)
// 반응은 장소(places)에 종속되며, 권한은 place→board→couple 경로의 RLS 로 강제된다.

// 보드의 모든 장소 반응 (RLS: 커플 멤버만). place→board 조인으로 보드 범위로 한정.
export async function listReactions(boardId: string): Promise<PlaceReaction[]> {
  const { data, error } = await supabase
    .from('place_reactions')
    .select('id, place_id, user_id, reaction_type, created_at, places!inner(board_id)')
    .eq('places.board_id', boardId);
  if (error) throw error;
  // 조인은 보드 필터 용도 → places 필드는 버리고 PlaceReaction 형태로 정리.
  return (data ?? []).map(({ places: _places, ...r }) => r as PlaceReaction);
}

// 반응 추가 (본인). 같은 (장소, 본인, 타입) 중복은 무시한다(add 멱등).
export async function addReaction(placeId: string, type: ReactionType): Promise<void> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const uid = userData.user?.id;
  if (!uid) throw new Error('인증된 사용자가 없습니다.');

  const { error } = await supabase
    .from('place_reactions')
    .upsert(
      { place_id: placeId, user_id: uid, reaction_type: type },
      { onConflict: 'place_id,user_id,reaction_type', ignoreDuplicates: true }
    );
  if (error) throw error;
}

// 반응 제거 (본인 행만 — RLS 도 본인으로 제한). 토글용(P1).
export async function removeReaction(placeId: string, type: ReactionType): Promise<void> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const uid = userData.user?.id;
  if (!uid) throw new Error('인증된 사용자가 없습니다.');

  const { error } = await supabase
    .from('place_reactions')
    .delete()
    .eq('place_id', placeId)
    .eq('user_id', uid)
    .eq('reaction_type', type);
  if (error) throw error;
}
