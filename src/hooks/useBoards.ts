import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import {
  createBoard,
  deleteBoard,
  getBoardActivity,
  listBoards,
  markBoardRead,
  renameBoard,
  setBoardMapStyle,
} from '../services/boardService';
import type { Board } from '../types/models';

// 워크스페이스의 보드 목록 조회
export function useBoards(coupleId: string | undefined) {
  return useQuery({
    queryKey: ['boards', coupleId],
    queryFn: () => listBoards(coupleId as string),
    enabled: !!coupleId,
  });
}

// 보드 생성 (성공 시 목록 무효화)
export function useCreateBoard(coupleId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (title: string) => createBoard(coupleId as string, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards', coupleId] });
    },
  });
}

// 보드 이름 바꾸기
export function useRenameBoard(coupleId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ boardId, title }: { boardId: string; title: string }) =>
      renameBoard(boardId, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards', coupleId] });
    },
  });
}

// 보드 바탕 바꾸기. 고르자마자 지도가 바뀌도록 목록 캐시를 먼저 고치고(낙관), 실패하면 되돌린다.
export function useSetBoardMapStyle(coupleId: string | undefined) {
  const queryClient = useQueryClient();
  const key = ['boards', coupleId];
  return useMutation({
    mutationFn: ({ boardId, mapStyle }: { boardId: string; mapStyle: string }) =>
      setBoardMapStyle(boardId, mapStyle),
    onMutate: async ({ boardId, mapStyle }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<Board[]>(key);
      queryClient.setQueryData<Board[]>(key, (list) =>
        list?.map((b) => (b.id === boardId ? { ...b, map_style: mapStyle } : b))
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(key, ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

// 보드 삭제
export function useDeleteBoard(coupleId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (boardId: string) => deleteBoard(boardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards', coupleId] });
      queryClient.invalidateQueries({ queryKey: ['board-activity'] });
    },
  });
}

// 보드별 새 흔적. 실패해도(0009 미적용 등) 목록은 그대로 보이도록 재시도하지 않는다.
export function useBoardActivity(coupleId: string | undefined) {
  return useQuery({
    queryKey: ['board-activity', coupleId],
    queryFn: getBoardActivity,
    enabled: !!coupleId,
    retry: false,
  });
}

// 보드를 봤다고 기록하고 목록의 새 흔적 표시를 갱신한다. 기록 실패는 화면에 영향 없게 무시.
export function useMarkBoardRead() {
  const queryClient = useQueryClient();
  return useCallback(
    (boardId: string) => {
      markBoardRead(boardId)
        .then(() => queryClient.invalidateQueries({ queryKey: ['board-activity'] }))
        .catch(() => {});
    },
    [queryClient]
  );
}
