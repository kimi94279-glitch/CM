import type { PlaceMatchResponse, PlaceSearchResult } from '../types/models';

// 핀 확정 모드의 출발점(ADR-016 하이브리드, docs/Place Matching.md §5·§11).
//   public       = 공공데이터 레코드와 맞음 → 그 이름·좌표로 시작(고칠 수 있음)
//   publicUnsure = 맞는 것 같지만 확인 필요(가까운 다른 가게·부분 일치) → 카드에서 "다른 곳이에요"
//   live         = 공공데이터에 없음 → 카카오 실시간 핀: 카카오 위치를 보여 주기만 하고, 저장은 장소 ID·검색어·동네 중심 자리표시
//   noMatch      = 실시간 핀도 못 만듦(카카오 ID·동네 정보 없음) → 사용자가 직접 찍고 이름을 씀
//   direct       = 검색 없이 지금 지도 가운데에 직접 찍기
export type PlaceDraftKind = 'public' | 'publicUnsure' | 'live' | 'noMatch' | 'direct';

// 실시간 핀으로 바꾸는 데 필요한 것 — 카카오 값(info·at)은 화면 표시용 메모리에만 있다.
export interface LiveOption {
  kakaoPlaceId: string;
  query: string; // 사용자가 친 검색어(저장 — 다시 찾는 열쇠)
  placeholder: { latitude: number; longitude: number }; // 우리 데이터의 동네 중심(저장)
  info: { name: string; address: string }; // 카카오 이름·주소(표시만)
  at: { latitude: number; longitude: number }; // 카카오 좌표(지도 이동·표시만)
}

export interface PlacingDraft {
  kind: PlaceDraftKind;
  name: string;
  provider: 'public' | 'manual' | 'kakao_live';
  providerPlaceId: string | null; // public 이면 상가업소번호
  kakaoPlaceId: string | null; // 카카오맵 링크용 — 카카오에서 저장하는 건 이것뿐
  liveQuery: string | null; // kakao_live 이면 다시 찾을 검색어
  // 저장할 핀 자리. null = 확정 순간의 지도 가운데(사용자가 맞춘 자리). live 는 동네 중심(자리표시)
  latitude: number | null;
  longitude: number | null;
  // 처음 지도를 옮길 곳(공공 좌표·카카오 위치·동네 중심). null = 지금 자리 그대로
  camera: { latitude: number; longitude: number } | null;
  live: LiveOption | null; // 실시간 핀으로 바꿀 수 있으면(공공 매칭이 틀렸을 때 "다른 곳이에요")
}

const KAKAO_ID = /^[0-9]{1,20}$/;
const QUERY_MAX = 100;

// 두 좌표 사이 거리(m, 하버사인)
export function metersBetween(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = Math.PI / 180;
  const dLat = (bLat - aLat) * toRad;
  const dLng = (bLng - aLng) * toRad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * toRad) * Math.cos(bLat * toRad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

function kakaoIdOf(result: PlaceSearchResult): string | null {
  return result.providerPlaceId && KAKAO_ID.test(result.providerPlaceId)
    ? result.providerPlaceId
    : null;
}

function liveOptionOf(
  result: PlaceSearchResult,
  res: PlaceMatchResponse | null,
  query: string
): LiveOption | null {
  const kakaoPlaceId = kakaoIdOf(result);
  const q = query.trim().slice(0, QUERY_MAX);
  if (!kakaoPlaceId || !q || !res?.dong) return null;
  return {
    kakaoPlaceId,
    query: q,
    placeholder: { latitude: res.dong.latitude, longitude: res.dong.longitude },
    info: { name: result.name, address: result.address },
    at: { latitude: result.latitude, longitude: result.longitude },
  };
}

// 실시간 핀 초안: 지도는 카카오 위치로 옮겨 보여 주고(표시), 저장 좌표는 동네 중심. 이름은 비워 두면 검색어로 저장된다.
export function liveDraft(live: LiveOption): PlacingDraft {
  return {
    kind: 'live',
    name: '',
    provider: 'kakao_live',
    providerPlaceId: null,
    kakaoPlaceId: live.kakaoPlaceId,
    liveQuery: live.query,
    latitude: live.placeholder.latitude,
    longitude: live.placeholder.longitude,
    camera: live.at,
    live,
  };
}

// 고른 카카오 결과 + 매칭 응답 → 핀 초안. 카카오 이름·좌표는 저장 값에 쓰지 않는다(ID·사용자 검색어만).
// res 가 null 이면(매칭 요청 실패) 직접 찍기로 떨어진다.
export function draftFromMatch(
  result: PlaceSearchResult,
  res: PlaceMatchResponse | null,
  query: string
): PlacingDraft {
  const live = liveOptionOf(result, res, query);
  const m = res?.match;
  if (m) {
    const point = { latitude: m.latitude, longitude: m.longitude };
    return {
      kind: m.confidence === 'high' ? 'public' : 'publicUnsure',
      name: [m.name, m.branch].filter(Boolean).join(' '),
      provider: 'public',
      providerPlaceId: m.poiId,
      kakaoPlaceId: kakaoIdOf(result),
      liveQuery: null,
      ...point,
      camera: point,
      live,
    };
  }
  if (live) return liveDraft(live);
  return {
    kind: 'noMatch',
    name: '',
    provider: 'manual',
    providerPlaceId: null,
    kakaoPlaceId: kakaoIdOf(result),
    liveQuery: null,
    latitude: null,
    longitude: null,
    camera: res?.dong ? { latitude: res.dong.latitude, longitude: res.dong.longitude } : null,
    live: null,
  };
}

// 검색 없이 직접 찍기. 이름은 사용자가 친 검색어(사용자 입력) 또는 빈칸.
export function directDraft(name: string, kakaoPlaceId: string | null = null): PlacingDraft {
  return {
    kind: kakaoPlaceId ? 'noMatch' : 'direct',
    name,
    provider: 'manual',
    providerPlaceId: null,
    kakaoPlaceId,
    liveQuery: null,
    latitude: null,
    longitude: null,
    camera: null,
    live: null,
  };
}
