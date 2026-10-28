import type { Place } from '../types/models';

// 카카오맵 장소 페이지(앱이 있으면 앱, 없으면 웹). 저장해 둔 카카오 장소 ID 로만 만든다.
export function kakaoPlaceUrl(placeId: string): string {
  return `https://place.map.kakao.com/${encodeURIComponent(placeId)}`;
}

// 핀의 카카오 장소 ID — kakao_place_id(0014), 예전 카카오 핀이면 provider_place_id.
export function kakaoPlaceIdOf(
  place: Pick<Place, 'provider' | 'provider_place_id' | 'kakao_place_id'>
): string | null {
  if (place.kakao_place_id) return place.kakao_place_id;
  return place.provider === 'kakao' ? place.provider_place_id : null;
}
