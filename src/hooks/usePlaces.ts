import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { addPlace, listPlaces, removePlace } from '../services/placeService';
import { searchPlaces } from '../services/placeSearchService';
import { KAKAO_SEARCH_ASSIST } from '../constants/config';
import type { PlaceDraft } from '../types/models';

// 보드의 장소 목록
export function usePlaces(boardId: string) {
  return useQuery({
    queryKey: ['places', boardId],
    queryFn: () => listPlaces(boardId),
  });
}

// 장소 추가 (성공 시 목록 무효화)
export function useAddPlace(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (draft: PlaceDraft) => addPlace(boardId, draft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['places', boardId] });
    },
  });
}

// 장소 삭제 (성공 시 목록 무효화)
export function useDeletePlace(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (placeId: string) => removePlace(placeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['places', boardId] });
    },
  });
}

// 장소 검색 (제출된 검색어 기준). query 가 비어있거나 찾기 보조가 꺼져 있으면 비활성.
// 결과는 메모리에만 잠깐 둔다(화면을 벗어나면 5분 뒤 버림, 디스크에 저장하지 않음 — 카카오 운영정책).
export function usePlaceSearch(query: string) {
  return useQuery({
    queryKey: ['place-search', query],
    queryFn: () => searchPlaces(query),
    enabled: KAKAO_SEARCH_ASSIST && query.trim().length > 0,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}
