import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import { useMemo } from 'react';

import { addPlace, listPlaces, removePlace } from '../services/placeService';
import {
  matchPlace,
  resolveLivePlace,
  searchPlaces,
  type LiveItem,
} from '../services/placeSearchService';
import { KAKAO_SEARCH_ASSIST } from '../constants/config';
import type { LivePlace, LiveResolveResponse, Place, PlaceDraft } from '../types/models';
import { isSearchable } from '../utils/searchText';

// 카카오 로컬 쿼터(키워드 검색 하루 10만 건 무료, 넘으면 건당 2원)를 아끼려고 결과를 앱 메모리에 둔다.
// 앱을 켜 있는 동안만 쓰고(새로 켜면 다시 불러옴) 디스크에는 저장하지 않는다 — 카카오 측 답변 "세션 동안 일시 유지 후 폐기는 가능".
// 운영정책(캐시를 최신으로 유지)을 지키려고 오래 켜 둔 앱은 실시간 핀을 6시간마다 한 번 새로 받는다.
const SEARCH_FRESH_MS = 60 * 60_000;
const LIVE_FRESH_MS = 6 * 60 * 60_000;

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

// 장소 검색 (제출된 검색어 기준). 두 글자 미만·조합 중인 한글("성수 ㅎ")이거나 찾기 보조가 꺼져 있으면 부르지 않는다.
// 검색 한 번 = 카카오 호출 1번(결과 15건). 같은 검색어는 1시간 동안 다시 부르지 않는다(메모리만).
export function usePlaceSearch(query: string) {
  return useQuery({
    queryKey: ['place-search', query],
    queryFn: () => searchPlaces(query),
    enabled: KAKAO_SEARCH_ASSIST && isSearchable(query),
    staleTime: SEARCH_FRESH_MS,
    gcTime: SEARCH_FRESH_MS,
  });
}

// 고른 검색 결과 1건 → 공공데이터 매칭(+ 동네 중심). 결과는 핀 초안으로만 쓰고 캐시하지 않는다.
export function useMatchPlace() {
  return useMutation({ mutationFn: matchPlace, gcTime: 0 });
}

type LiveResult = { id: string; place: LivePlace | null };

// useQueries 결과 → 화면용 묶음. 모듈 수준 함수라 참조가 고정돼 결과가 그대로면 같은 객체를 돌려준다(지도 재주입 방지).
function combineLive(results: UseQueryResult<LiveResult>[]): LiveResolveResponse {
  const places: Record<string, LivePlace> = {};
  const missing: string[] = [];
  for (const r of results) {
    if (!r.data) continue; // 불러오는 중·실패 → 지도에 안 그림(목록엔 그대로)
    if (r.data.place) places[r.data.id] = r.data.place;
    else missing.push(r.data.id);
  }
  return { places, missing, failed: [] };
}

// 보드의 실시간 핀(kakao_live)들을 카카오에서 다시 불러온다 — 핀마다 앱을 켜 있는 동안 기억하고(최대 6시간),
// 새로 필요한 핀만 짧게 모아 한 번에 요청한다. 서버는 같은 검색어 핀을 카카오 1번으로 같이 찾는다(실측 17핀 → 6번).
export function useLivePlaces(places: Place[]): LiveResolveResponse {
  const items = useMemo<LiveItem[]>(
    () =>
      places
        .filter((p) => p.provider === 'kakao_live' && p.kakao_place_id && p.live_query)
        .map((p) => ({
          id: p.kakao_place_id as string,
          query: p.live_query as string,
          near: { lat: p.latitude, lng: p.longitude }, // 저장된 동네 중심(자리표시)
        })),
    [places]
  );
  return useQueries({
    queries: items.map((item) => ({
      queryKey: ['live-place', item.id, item.query],
      queryFn: async (): Promise<LiveResult> => ({
        id: item.id,
        place: await resolveLivePlace(item),
      }),
      enabled: KAKAO_SEARCH_ASSIST,
      staleTime: LIVE_FRESH_MS,
      gcTime: Infinity, // 보드를 나갔다 와도 앱이 켜 있는 동안은 다시 부르지 않게
      retry: 1,
    })),
    combine: combineLive,
  });
}
