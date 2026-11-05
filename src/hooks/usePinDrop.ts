import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

import { useMapHost, type MapPoint } from '../components/MapHostContext';
import { nearPlaces } from '../services/placeSearchService';
import { friendlyError } from '../utils/errors';
import { metersBetween, snapRadiusM } from '../utils/placeDraft';
import { useAddPlace, useUpdatePlace } from './usePlaces';

type LatLng = { latitude: number; longitude: number };

// 꽂은 직후 쪽지: 지금 자리(at)와 바꿀 수 있는 반대쪽 자리(other — 붙였으면 누른 자리, 그대로 꽂았으면 가까운 가게 자리)
export interface PinNote {
  placeId: string;
  snapped: boolean; // 가게 자리에 붙였는지
  at: LatLng;
  other: LatLng | null;
}

const NOTE_MS = 8000;
const SAME_SPOT_M = 3; // 이보다 가까우면 반대쪽 자리를 묻지 않는다

// 핀 도구 "바로 꽂기"(2026-11-05): 핀은 가게를 띄우는 게 아니라 자리(좌표)를 찍는 것 — 확인 카드 없이 누르는 즉시 꽂는다.
// 건물 위를 누르면 둘레 공공데이터 가게 중 가장 가까운 가게 자리로 붙이고(손가락 오차 바로잡기),
// 길·공원·광장을 누르면 누른 자리 그대로. 꽂은 뒤 쪽지로 반대쪽 자리로 한 번에 옮길 수 있다.
// 이름은 비워 두고 나중에(핀을 눌러) 붙인다. onDropped = 꽂힌 뒤(지도 '퐁' 연출·되돌리기 목록).
export function usePinDrop(boardId: string, onDropped: (placeId: string) => void) {
  const map = useMapHost();
  const addPlace = useAddPlace(boardId);
  const updatePlace = useUpdatePlace(boardId);
  // 꽂는 중 두 번 눌러도 한 번만(지도 콜백은 등록 때의 함수를 들고 있어서 상태 대신 ref 로 막는다)
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [note, setNote] = useState<PinNote | null>(null);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (noteTimer.current) clearTimeout(noteTimer.current);
    },
    []
  );
  const showNote = (next: PinNote | null) => {
    if (noteTimer.current) clearTimeout(noteTimer.current);
    setNote(next);
    if (next) noteTimer.current = setTimeout(() => setNote(null), NOTE_MS);
  };

  const dropAt = async (point: MapPoint) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    showNote(null);
    const tapped = { latitude: point.lat, longitude: point.lng };
    map.pendingPin(boardId, { lat: point.lat, lng: point.lng }); // 찾는 동안 누른 자리에 압정(바늘이 닿으면 진동)
    try {
      // 가게 자리는 건물을 눌렀을 때 붙일 곳이자, 길을 눌렀을 때 쪽지로 권할 곳 — 못 찾으면 없는 셈 친다
      const near = await nearPlaces(
        point.lat,
        point.lng,
        snapRadiusM(point.lat, point.level)
      ).catch(() => []);
      const shop = near[0] ? { latitude: near[0].latitude, longitude: near[0].longitude } : null;
      const snapped = !!(point.onBuilding && shop);
      const at = snapped && shop ? shop : tapped;
      const saved = await addPlace.mutateAsync({
        name: '',
        latitude: at.latitude,
        longitude: at.longitude,
        provider: 'manual',
        providerPlaceId: null,
        kakaoPlaceId: null,
        liveQuery: null,
      });
      onDropped(saved.id);
      const other = snapped ? tapped : shop;
      const apart =
        !!other &&
        metersBetween(at.latitude, at.longitude, other.latitude, other.longitude) >= SAME_SPOT_M;
      // 붙였으면 늘 알린다(어디로 갔는지). 그대로 꽂았으면 가까운 가게가 있을 때만.
      if (snapped || apart)
        showNote({ placeId: saved.id, snapped, at, other: apart ? other : null });
    } catch (e) {
      Alert.alert('핀을 꽂지 못했어요', friendlyError(e));
    } finally {
      busyRef.current = false;
      setBusy(false);
      map.pendingPin(boardId, null); // 꽂힌 핀이 '퐁' 떨어지며 이어받는다
    }
  };

  // 쪽지의 "누른 자리로" / "가게 자리로": 꽂은 핀을 반대쪽 자리로 옮긴다(쪽지는 다시 반대로 바뀐다)
  const moveToOther = () => {
    if (!note?.other) return;
    const { placeId, at, other, snapped } = note;
    updatePlace.mutate(
      { placeId, patch: { latitude: other.latitude, longitude: other.longitude } },
      { onError: (e) => Alert.alert('핀을 옮기지 못했어요', friendlyError(e)) }
    );
    showNote({ placeId, snapped: !snapped, at: other, other: at });
  };

  return { busy, dropAt, note, moveToOther, dismissNote: () => showNote(null) };
}
