import type { Place } from '../types/models';

// 카카오맵 장소 페이지(앱이 있으면 앱, 없으면 웹). 저장해 둔 카카오 장소 ID 로만 만든다.
export function kakaoPlaceUrl(placeId: string): string {
  return `https://place.map.kakao.com/${encodeURIComponent(placeId)}`;
}

// 핀의 카카오 장소 ID(0014) — 공공 레코드·실시간 핀 모두 이 칸에 있다.
export function kakaoPlaceIdOf(place: Pick<Place, 'kakao_place_id'>): string | null {
  return place.kakao_place_id;
}
