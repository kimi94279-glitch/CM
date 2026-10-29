import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { addPlace, listPlaces, removePlace } from '../services/placeService';
import { matchPlace, resolveLivePlaces, searchPlaces } from '../services/placeSearchService';
import { KAKAO_SEARCH_ASSIST } from '../constants/config';
import type { Place, PlaceDraft } from '../types/models';

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

// 고른 검색 결과 1건 → 공공데이터 매칭(+ 동네 중심). 결과는 핀 초안으로만 쓰고 캐시하지 않는다.
export function useMatchPlace() {
  return useMutation({ mutationFn: matchPlace, gcTime: 0 });
}

// 보드의 실시간 핀(kakao_live)들을 카카오에서 다시 불러온다. 앱 메모리에만 잠깐 두고(디스크 저장 없음) 버린다.
export function useLivePlaces(places: Place[]) {
  const items = useMemo(
    () =>
      places
        .filter((p) => p.provider === 'kakao_live' && p.kakao_place_id && p.live_query)
        .map((p) => ({ id: p.kakao_place_id as string, query: p.live_query as string }))
        .sort((a, b) => a.id.localeCompare(b.id)),
    [places]
  );
  const key = items.map((i) => `${i.id}:${i.query}`).join('|');
  return useQuery({
    queryKey: ['live-places', key],
    queryFn: () => resolveLivePlaces(items),
    enabled: KAKAO_SEARCH_ASSIST && items.length > 0,
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
  });
}
