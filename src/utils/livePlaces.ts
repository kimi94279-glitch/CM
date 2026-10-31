import type { LiveResolveResponse, Place } from '../types/models';

// 실시간 핀(kakao_live)을 화면용으로 바꾼다 — 저장된 행은 건드리지 않고, 그 순간 카카오에서 불러온 값으로 덮어 그린다.
//   mapPlaces  = 지도에 그릴 핀: 실시간 핀은 불러온 좌표가 있을 때만(아직이거나 못 찾으면 그리지 않음 — 동네 중심에 잘못 꽂히지 않게)
//   listPlaces = 목록: 전부. 못 찾은 실시간 핀은 이름 뒤에 알림을 붙인다.
// 이름: 사용자가 이름을 붙였으면 그 이름, 안 붙였으면(저장 이름 = 검색어) 카카오의 지금 이름.
export function applyLivePlaces(
  places: Place[],
  live: LiveResolveResponse | undefined
): { mapPlaces: Place[]; listPlaces: Place[]; missingIds: Set<string> } {
  const mapPlaces: Place[] = [];
  const listPlaces: Place[] = [];
  const missingIds = new Set<string>();
  for (const p of places) {
    if (p.provider !== 'kakao_live' || !p.kakao_place_id) {
      mapPlaces.push(p);
      listPlaces.push(p);
      continue;
    }
    const now = live?.places[p.kakao_place_id];
    if (now) {
      const shown: Place = {
        ...p,
        name: p.name === p.live_query && now.name ? now.name : p.name,
        latitude: now.latitude,
        longitude: now.longitude,
      };
      mapPlaces.push(shown);
      listPlaces.push(shown);
    } else if (live?.missing.includes(p.kakao_place_id)) {
      missingIds.add(p.id);
      listPlaces.push({ ...p, name: `${p.name} (카카오에서 찾을 수 없어요)` });
    } else {
      listPlaces.push(p);
    }
  }
  return { mapPlaces, listPlaces, missingIds };
}
