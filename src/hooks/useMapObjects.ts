import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  addMapObject,
  listMapObjects,
  removeMapObject,
  updateMapObject,
  type MapObjectPatch,
  type NewMapObject,
} from '../services/mapObjectService';
import type { MapObject } from '../types/models';

// 보드의 지리 객체 목록. 재진입/앱 복귀 시 상대가 남긴 객체 반영(반응 훅과 동일 정책).
export function useMapObjects(boardId: string) {
  return useQuery({
    queryKey: ['map-objects', boardId],
    queryFn: () => listMapObjects(boardId),
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

// 지리 객체 추가. 낙관적 반영(배치 즉시 표시) → 서버 응답 후 무효화로 실데이터 교체.
export function useAddMapObject(boardId: string) {
  const queryClient = useQueryClient();
  const key = ['map-objects', boardId];
  return useMutation({
    mutationFn: (obj: NewMapObject) => addMapObject(boardId, obj),
    onMutate: async (obj) => {
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<MapObject[]>(key);
      const now = new Date().toISOString();
      const temp: MapObject = {
        id: `temp-${Date.now()}`,
        board_id: boardId,
        type: obj.type,
        latitude: obj.latitude,
        longitude: obj.longitude,
        zoom_level: obj.zoomLevel,
        payload: obj.payload,
        created_by: '',
        created_at: now,
        updated_at: now,
      };
      queryClient.setQueryData<MapObject[]>(key, [...(prev ?? []), temp]);
      return { prev };
    },
    onError: (_e, _obj, ctx) => {
      // 실패 시 낙관 반영 롤백.
      if (ctx?.prev) queryClient.setQueryData(key, ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

// 지리 객체 수정 (이동/크기 등). 성공 시 목록 무효화.
export function useUpdateMapObject(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: MapObjectPatch }) => updateMapObject(id, patch),
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
