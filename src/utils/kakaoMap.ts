// 카카오맵 장소 페이지(앱이 있으면 앱, 없으면 웹). 저장해 둔 카카오 장소 ID 로만 만든다.
export function kakaoPlaceUrl(placeId: string): string {
  return `https://place.map.kakao.com/${encodeURIComponent(placeId)}`;
}
