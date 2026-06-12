import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  addMapObject,
  listMapObjects,
  removeMapObject,
  type NewMapObject,
} from '../services/mapObjectService';

// 보드의 지리 객체 목록. 재진입/앱 복귀 시 상대가 남긴 객체 반영(반응 훅과 동일 정책).
export function useMapObjects(boardId: string) {
  return useQuery({
    queryKey: ['map-objects', boardId],
    queryFn: () => listMapObjects(boardId),
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

// 지리 객체 추가 (성공 시 목록 무효화)
export function useAddMapObject(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (obj: NewMapObject) => addMapObject(boardId, obj),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['map-objects', boardId] });
    },
  });
}

// 지리 객체 삭제 (성공 시 목록 무효화). P1 용.
export function useRemoveMapObject(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeMapObject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['map-objects', boardId] });
    },
  });
}
