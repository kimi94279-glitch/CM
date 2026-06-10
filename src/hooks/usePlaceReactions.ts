import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { addReaction, listReactions, removeReaction } from '../services/placeReactionService';
import type { ReactionType } from '../types/models';

// 보드의 장소 반응 목록.
// 재진입(앱/화면 복귀) 시 상대가 남긴 반응을 반영하도록 mount 마다 refetch 한다.
// (실시간 미사용 — '재오픈 시 보임'이 v0 의도. 화면 포커스 refetch 배선은 UI 단계에서.)
export function usePlaceReactions(boardId: string) {
  return useQuery({
    queryKey: ['place-reactions', boardId],
    queryFn: () => listReactions(boardId),
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

// 반응 추가 (성공 시 목록 무효화)
export function useAddReaction(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ placeId, type }: { placeId: string; type: ReactionType }) =>
      addReaction(placeId, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['place-reactions', boardId] });
    },
  });
}

// 반응 제거 (성공 시 목록 무효화). 토글용(P1).
export function useRemoveReaction(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ placeId, type }: { placeId: string; type: ReactionType }) =>
      removeReaction(placeId, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['place-reactions', boardId] });
    },
  });
}
