import type { Place, PlaceSearchResult } from '../types/models';
import { supabase } from './supabase';

// 모든 데이터 접근은 service 계층을 통해서만 수행한다. (ARCHITECTURE.md)
// 장소는 보드에 소속되며, 보드는 워크스페이스(couples)에 소속된다.

// 보드의 장소 목록 (순서대로). RLS 로 본인 워크스페이스만 조회됨.
export async function listPlaces(boardId: string): Promise<Place[]> {
  const { data, error } = await supabase
    .from('places')
    .select('*')
    .eq('board_id', boardId)
    .order('order_index', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// 다음 order_index 계산 (현재 최대 + 1, 없으면 0)
async function nextOrderIndex(boardId: string): Promise<number> {
  const { data, error } = await supabase
    .from('places')
    .select('order_index')
    .eq('board_id', boardId)
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? data.order_index + 1 : 0;
}

// 검색 결과를 보드에 추가
export async function addPlace(boardId: string, result: PlaceSearchResult): Promise<Place> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const uid = userData.user?.id;
  if (!uid) throw new Error('인증된 사용자가 없습니다.');

  const orderIndex = await nextOrderIndex(boardId);

  const { data, error } = await supabase
    .from('places')
    .insert({
      board_id: boardId,
      name: result.name,
      latitude: result.latitude,
      longitude: result.longitude,
      provider: result.provider,
      provider_place_id: result.providerPlaceId,
      order_index: orderIndex,
      created_by: uid,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}
