import type { MapObject, MapObjectType } from '../types/models';
import { supabase } from './supabase';

// 모든 데이터 접근은 service 계층을 통해서만 수행한다. (ARCHITECTURE.md)
// map_objects 는 보드(캔버스)에 종속되며, 권한은 board→couple 경로의 RLS 로 강제된다.

// 생성 입력. zoom_level 은 생성 당시 줌 — world-space 스케일 기준(렌더에서 객체 크기로 사용).
export interface NewMapObject {
  type: MapObjectType;
  latitude: number;
  longitude: number;
  zoomLevel: number;
  payload: Record<string, unknown>;
}

// 보드의 모든 지리 객체 (RLS: 커플 멤버만). P0 는 정책 없이 전부 반환.
export async function listMapObjects(boardId: string): Promise<MapObject[]> {
  const { data, error } = await supabase.from('map_objects').select('*').eq('board_id', boardId);
  if (error) throw error;
  return data ?? [];
}

// 지리 객체 추가.
export async function addMapObject(boardId: string, obj: NewMapObject): Promise<MapObject> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const uid = userData.user?.id;
  if (!uid) throw new Error('인증된 사용자가 없습니다.');

  const { data, error } = await supabase
    .from('map_objects')
    .insert({
      board_id: boardId,
      type: obj.type,
      latitude: obj.latitude,
      longitude: obj.longitude,
      zoom_level: obj.zoomLevel,
      payload: obj.payload,
      created_by: uid,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// 지리 객체 삭제 (RLS: 커플 멤버).
export async function removeMapObject(id: string): Promise<void> {
  const { error } = await supabase.from('map_objects').delete().eq('id', id);
  if (error) throw error;
}
