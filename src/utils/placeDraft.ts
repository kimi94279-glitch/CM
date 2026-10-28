import type { PlaceMatchResponse, PlaceSearchResult } from '../types/models';

// 핀 확정 모드의 출발점(ADR-016 Option D′, docs/Place Matching.md §5).
//   public       = 공공데이터 레코드와 맞음 → 그 이름·좌표로 시작(고칠 수 있음)
//   publicUnsure = 맞는 것 같지만 확인 필요(가까운 다른 가게·부분 일치) → 카드에서 "다른 곳이면 직접 찍기"
//   noMatch      = 저장할 수 있는 장소 정보가 없음 → 동네까지만 옮기고 사용자가 직접 찍고 이름을 씀
//   direct       = 검색 없이 지금 지도 가운데에 직접 찍기
export type PlaceDraftKind = 'public' | 'publicUnsure' | 'noMatch' | 'direct';

export interface PlacingDraft {
  kind: PlaceDraftKind;
  name: string;
  provider: 'public' | 'manual';
  providerPlaceId: string | null; // public 이면 상가업소번호
  kakaoPlaceId: string | null; // 카카오맵 링크용 — 카카오에서 남기는 건 이것뿐
  // 기본 핀 자리(공공 좌표). null = 확정 순간의 지도 가운데
  latitude: number | null;
  longitude: number | null;
  // 처음 지도를 옮길 곳(공공 좌표 또는 우리 데이터의 동네 중심). null = 지금 자리 그대로
  camera: { latitude: number; longitude: number } | null;
}

const KAKAO_ID = /^[0-9]{1,20}$/;

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

// 고른 카카오 결과 + 매칭 응답 → 핀 초안. 카카오 이름·좌표는 여기서 쓰지 않는다(ID 만).
// res 가 null 이면(매칭 요청 실패) 직접 찍기로 떨어진다.
export function draftFromMatch(
  result: PlaceSearchResult,
  res: PlaceMatchResponse | null
): PlacingDraft {
  const kakaoPlaceId = kakaoIdOf(result);
  const m = res?.match;
  if (m) {
    const point = { latitude: m.latitude, longitude: m.longitude };
    return {
      kind: m.confidence === 'high' ? 'public' : 'publicUnsure',
      name: [m.name, m.branch].filter(Boolean).join(' '),
      provider: 'public',
      providerPlaceId: m.poiId,
      kakaoPlaceId,
      ...point,
      camera: point,
    };
  }
  return {
    kind: 'noMatch',
    name: '',
    provider: 'manual',
    providerPlaceId: null,
    kakaoPlaceId,
    latitude: null,
    longitude: null,
    camera: res?.dong ? { latitude: res.dong.latitude, longitude: res.dong.longitude } : null,
  };
}

// "다른 곳이에요" / 검색 없이 직접 찍기. 이름은 사용자가 친 검색어(사용자 입력) 또는 빈칸.
export function directDraft(name: string, kakaoPlaceId: string | null = null): PlacingDraft {
  return {
    kind: kakaoPlaceId ? 'noMatch' : 'direct',
    name,
    provider: 'manual',
    providerPlaceId: null,
    kakaoPlaceId,
    latitude: null,
    longitude: null,
    camera: null,
  };
}
