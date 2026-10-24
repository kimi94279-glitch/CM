import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { addMemo, listMemos, removeMemo } from '../services/placeMemoService';
import type { PlaceMemo } from '../types/models';

// 보드의 장소 메모 목록. 재진입/앱 복귀 시 상대가 남긴 메모 반영(반응 훅과 동일 정책).
export function usePlaceMemos(boardId: string) {
  return useQuery({
    queryKey: ['place-memos', boardId],
    queryFn: () => listMemos(boardId),
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

// 메모 추가. 낙관적 반영(말풍선 즉시 표시) → 서버 응답 후 무효화로 실데이터 교체.
// 임시 메모는 id 가 temp-* 이고 user_id 가 비어 있다(작성자 = 나로 취급).
export function useAddMemo(boardId: string) {
  const queryClient = useQueryClient();
  const key = ['place-memos', boardId];
  return useMutation({
    mutationFn: ({ placeId, content }: { placeId: string; content: string }) =>
      addMemo(placeId, content),
    onMutate: async ({ placeId, content }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<PlaceMemo[]>(key);
      const now = new Date().toISOString();
      const temp: PlaceMemo = {
        id: `temp-${Date.now()}`,
        place_id: placeId,
        user_id: '',
        content: content.trim(),
        created_at: now,
        updated_at: now,
      };
      queryClient.setQueryData<PlaceMemo[]>(key, [...(prev ?? []), temp]);
      return { prev };
    },
    onError: (_e, _vars, ctx) => {
      // 실패 시 낙관 반영 롤백.
      if (ctx?.prev) queryClient.setQueryData(key, ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

// 메모 삭제 (본인 것만, 성공 시 목록 무효화).
export function useRemoveMemo(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memoId: string) => removeMemo(memoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['place-memos', boardId] });
    },
  });
}
