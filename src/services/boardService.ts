import type { Board } from '../types/models';
import { supabase } from './supabase';

// 모든 데이터 접근은 service 계층을 통해서만 수행한다. (ARCHITECTURE.md)
// 보드는 워크스페이스(couples 행, solo 또는 active)에 소속된다.

// 워크스페이스의 보드 목록 (최신순). RLS 로 본인 워크스페이스만 조회됨.
export async function listBoards(coupleId: string): Promise<Board[]> {
  const { data, error } = await supabase
    .from('boards')
    .select('*')
    .eq('couple_id', coupleId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// 새 보드 생성
export async function createBoard(coupleId: string, title: string): Promise<Board> {
  const { data, error } = await supabase
    .from('boards')
    .insert({ couple_id: coupleId, title: title.trim() })
    .select()
    .single();
  if (error) throw error;
  return data;
}
