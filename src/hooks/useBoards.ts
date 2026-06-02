import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createBoard, listBoards } from '../services/boardService';

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
