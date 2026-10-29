import { useEffect, useRef, useState } from 'react';
import { Keyboard } from 'react-native';

import { useMapHost } from '../components/MapHostContext';
import type { PlaceDraftParam } from '../navigation/types';
import type { PlaceDraft, PlaceSearchResult } from '../types/models';
import { friendlyError } from '../utils/errors';
import {
  directDraft,
  draftFromMatch,
  liveDraft,
  metersBetween,
  type PlacingDraft,
} from '../utils/placeDraft';
import { useAddPlace, useMatchPlace } from './usePlaces';

type Placing = PlacingDraft & { key: number };

// 핀 확정 모드(ADR-016 하이브리드): 검색 결과(카카오)는 저장하지 않는다. 고르면 공공데이터에서 같은 가게를 찾아
// 그 레코드로 시작하고, 없으면 카카오 실시간 핀(장소 ID·검색어만 저장)으로 꽂는다(utils/placeDraft).
// 모드에 들어갈 때 화면의 다른 UI(검색·목록·반응·펜·스티커)를 닫도록 onStart 를 부른다.
// draftParam = 태블릿 장소 찾기(PlaceAdd)에서 돌아온 핀 초안(nonce 당 1회).
export function usePlacing(
  boardId: string,
  draftParam: PlaceDraftParam | undefined,
  onStart: () => void
) {
  const map = useMapHost();
  const addPlace = useAddPlace(boardId);
  const matchPlace = useMatchPlace();
  const [placing, setPlacing] = useState<Placing | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftError, setDraftError] = useState<string | null>(null);
  // 핀 확정 모드를 연 시각 — 이후에 보고된 지도 가운데만 "사용자가 맞춘 자리"로 쓴다.
  const placingSinceRef = useRef(0);

  const start = (next: PlacingDraft, key: number, error: string | null = null) => {
    onStart();
    setDraftName(next.name);
    setDraftError(error);
    setPlacing({ ...next, key });
  };

  // PlaceAdd 에서 돌아온 초안 → 렌더 중 상태 조정(nonce 당 1회, effect 안 setState 회피).
  const [seenDraftNonce, setSeenDraftNonce] = useState<number | null>(null);
  if (draftParam && draftParam.nonce !== seenDraftNonce) {
    const { nonce, ...draft } = draftParam;
    setSeenDraftNonce(nonce);
    start(draft, nonce);
  }

  // 모드 시작: 공공 레코드 자리나 동네 중심으로 지도를 옮긴다(직접 핀은 지금 자리 그대로).
  useEffect(() => {
    if (!placing) return;
    placingSinceRef.current = Date.now();
    if (placing.camera) {
      map.focus(boardId, placing.camera.latitude, placing.camera.longitude);
    }
  }, [placing, boardId, map]);

  // 검색 결과를 고름 → 공공데이터 매칭 결과로 시작(실패해도 실시간 핀·직접 찍기로).
  const selectResult = (result: PlaceSearchResult, query: string) => {
    if (matchPlace.isPending) return;
    matchPlace.mutate(result, {
      onSuccess: (res) => start(draftFromMatch(result, res, query), Date.now()),
      onError: () =>
        start(
          draftFromMatch(result, null, query),
          Date.now(),
          '장소 정보를 확인하지 못했어요. 지도에서 직접 찍어 주세요.'
        ),
    });
  };
  const startDirect = (name: string) => start(directDraft(name), Date.now());

  // "다른 곳이에요": 가까운 등록 가게가 아니면 카카오 실시간 핀으로, 그것도 안 되면 이름을 비우고 직접 찍기로.
  const switchToOther = () => {
    if (!placing) return;
    setDraftName('');
    setDraftError(null);
    const next = placing.live ? liveDraft(placing.live) : directDraft('', placing.kakaoPlaceId);
    setPlacing({ ...next, key: Date.now() });
  };

  const cancel = () => {
    Keyboard.dismiss();
    setPlacing(null);
    setDraftError(null);
  };

  const save = (draft: PlaceDraft) => {
    Keyboard.dismiss();
    addPlace.mutate(draft, {
      onSuccess: () => setPlacing(null),
      onError: (e) => setDraftError(friendlyError(e)),
    });
  };

  const confirm = () => {
    if (!placing) return;
    // 실시간 핀은 지도 가운데(= 카카오 위치)를 저장하지 않는다 — 동네 중심 자리표시만, 위치는 볼 때마다 카카오에서.
    if (placing.kind === 'live' && placing.latitude !== null && placing.longitude !== null) {
      save({
        name: draftName.trim() || (placing.liveQuery ?? ''),
        latitude: placing.latitude,
        longitude: placing.longitude,
        provider: 'kakao_live',
        providerPlaceId: null,
        kakaoPlaceId: placing.kakaoPlaceId,
        liveQuery: placing.liveQuery,
      });
      return;
    }
    const center = map.getCenter();
    const adjusted = center && center.at > placingSinceRef.current ? center : null;
    const lat = adjusted?.lat ?? placing.latitude ?? center?.lat ?? null;
    const lng = adjusted?.lng ?? placing.longitude ?? center?.lng ?? null;
    if (lat === null || lng === null) {
      setDraftError('지도를 조금 움직여 자리를 맞춘 뒤 다시 눌러 주세요.');
      return;
    }
    // 매칭이 안 된 곳은 동네 중심 그대로 꽂지 않는다 — 사용자가 직접 자리를 맞춘다.
    if (
      placing.kind === 'noMatch' &&
      placing.camera &&
      metersBetween(lat, lng, placing.camera.latitude, placing.camera.longitude) < 5
    ) {
      setDraftError('지도를 움직여 가운데 핀을 그 자리에 맞춰 주세요.');
      return;
    }
    save({
      name: draftName.trim(),
      latitude: lat,
      longitude: lng,
      provider: placing.provider,
      providerPlaceId: placing.providerPlaceId,
      kakaoPlaceId: placing.kakaoPlaceId,
      liveQuery: null,
    });
  };

  return {
    placing,
    draftName,
    setDraftName,
    draftError,
    saving: addPlace.isPending,
    selecting: matchPlace.isPending,
    selectResult,
    startDirect,
    switchToOther,
    cancel,
    confirm,
  };
}
