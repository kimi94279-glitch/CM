import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { addPlace, listPlaces } from '../services/placeService';
import { searchPlaces } from '../services/placeSearchService';
import type { PlaceSearchResult } from '../types/models';

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
    mutationFn: (result: PlaceSearchResult) => addPlace(boardId, result),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['places', boardId] });
    },
  });
}

// 장소 검색 (제출된 검색어 기준). query 가 비어있으면 비활성.
export function usePlaceSearch(query: string) {
  return useQuery({
    queryKey: ['place-search', query],
    queryFn: () => searchPlaces(query),
    enabled: query.trim().length > 0,
    staleTime: 60_000,
  });
}
