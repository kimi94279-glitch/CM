import type { Board, BoardActivity } from '../types/models';
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

// 보드 이름 바꾸기 (boards_update 정책: 같은 공간 멤버)
export async function renameBoard(boardId: string, title: string): Promise<Board> {
  const { data, error } = await supabase
    .from('boards')
    .update({ title: title.trim() })
    .eq('id', boardId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// 보드 바탕 바꾸기(0017 boards.map_style, boards_update 정책: 같은 공간 멤버 — 같이 그리는 사람에게도 같은 바탕)
export async function setBoardMapStyle(boardId: string, mapStyle: string): Promise<void> {
  const { error } = await supabase.from('boards').update({ map_style: mapStyle }).eq('id', boardId);
  if (error) throw error;
}

// 보드 삭제 — 장소·메모·반응·스티커·그림·읽음 기록이 함께 지워진다(on delete cascade).
export async function deleteBoard(boardId: string): Promise<void> {
  const { error } = await supabase.from('boards').delete().eq('id', boardId);
  if (error) throw error;
}

// 보드별 새 흔적 (board_activity RPC, 0009). 내 공간 보드만 돌아온다(RLS).
export async function getBoardActivity(): Promise<Record<string, BoardActivity>> {
  const { data, error } = await supabase.rpc('board_activity');
  if (error) throw error;
  const rows = (data ?? []) as {
    board_id: string;
    unread: number;
    last_activity_at: string | null;
  }[];
  return Object.fromEntries(
    rows.map((r) => [r.board_id, { unread: r.unread, lastActivityAt: r.last_activity_at }])
  );
}

// 지금 이 보드를 봤다고 기록 (서버 시각)
export async function markBoardRead(boardId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_board_read', { p_board_id: boardId });
  if (error) throw error;
}
