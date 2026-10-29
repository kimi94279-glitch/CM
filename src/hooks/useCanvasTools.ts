import { useMemo, useState } from 'react';
import { Alert } from 'react-native';

import type { DrawStroke } from '../components/MapHostContext';
import { friendlyError } from '../utils/errors';
import {
  useAddMapObject,
  useMapObjects,
  useRemoveMapObject,
  useUpdateMapObject,
} from './useMapObjects';

// P0 스티커 이모지 셋(지리 고정 객체). Text/Arrow 는 P0 범위 밖.
export const STICKER_EMOJIS = ['❤️', '😂', '👀', '🤮', '☕', '🌳', '📸'];

// Infinite Geographic Canvas 도구: 스티커(지도 탭으로 배치) · 펜(손가락으로 선) · 객체 편집(탭 선택 → 크기·삭제, 드래그 이동).
// 도구끼리는 서로 배타. 도구를 켤 때 화면의 다른 바(핀 반응)를 닫도록 onToolOn 을 부른다.
export function useCanvasTools(boardId: string, onToolOn: () => void) {
  const objectsQuery = useMapObjects(boardId);
  const objects = useMemo(() => objectsQuery.data ?? [], [objectsQuery.data]);
  const addMapObject = useAddMapObject(boardId);
  const updateMapObject = useUpdateMapObject(boardId);
  const removeMapObject = useRemoveMapObject(boardId);

  // 편집(Explore→Peek→Edit): 탭으로 객체 선택, 배경 탭으로 해제. 선택 시 편집 툴바 노출.
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const selectedObject = objects.find((o) => o.id === selectedObjectId) ?? null;
  const [stickerMode, setStickerMode] = useState(false);
  const [stickerEmoji, setStickerEmoji] = useState('❤️');
  // 펜 모드: 지도 위에 손가락으로 선을 그린다(내 잉크 soft 색). 켜 있는 동안 지도 이동은 잠긴다.
  const [penMode, setPenMode] = useState(false);
  // 이번 펜 모드에서 저장된 내 선(되돌리기용, 최근 것이 끝).
  const [drawnIds, setDrawnIds] = useState<string[]>([]);

  const togglePen = () => {
    const next = !penMode;
    setPenMode(next);
    setDrawnIds([]);
    if (next) {
      setStickerMode(false);
      setSelectedObjectId(null);
      onToolOn();
    }
  };
  const toggleSticker = () => {
    const next = !stickerMode;
    setStickerMode(next);
    if (next) {
      setPenMode(false);
      setSelectedObjectId(null);
      onToolOn();
    }
  };
  // 핀 확정 모드처럼 지도를 움직여야 할 때: 펜·스티커를 끈다(켜 있으면 지도가 안 움직인다).
  const stopTools = () => {
    setPenMode(false);
    setStickerMode(false);
  };
  // 핀을 탭했을 때: 스티커 모드·편집 선택을 닫는다.
  const closeForPlace = () => {
    setStickerMode(false);
    setSelectedObjectId(null);
  };
  const selectObject = (id: string | null) => {
    if (id) setStickerMode(false);
    setSelectedObjectId(id);
  };

  // 스티커 모드에서 지도 탭 → 그 자리에 지리 고정 스티커.
  const placeSticker = (point: { lat: number; lng: number; level: number }) =>
    addMapObject.mutate(
      {
        type: 'sticker',
        latitude: point.lat,
        longitude: point.lng,
        zoomLevel: point.level,
        payload: { emoji: stickerEmoji },
      },
      { onError: (e) => Alert.alert('스티커 저장 실패', friendlyError(e)) }
    );
  // 펜 한 획 → map_objects(draw) 저장. 앵커 = 첫 점, 굵기 스케일 기준 = 그린 줌(payload.z).
  const saveStroke = ({ points, zoom, width }: DrawStroke) =>
    addMapObject.mutate(
      {
        type: 'draw',
        latitude: points[0][1],
        longitude: points[0][0],
        zoomLevel: Math.round(zoom),
        payload: { points, z: zoom, w: width },
      },
      {
        onSuccess: (saved) => setDrawnIds((ids) => [...ids, saved.id]),
        onError: (e) => Alert.alert('그림 저장 실패', friendlyError(e)),
      }
    );
  const moveObject = (id: string, lat: number, lng: number) =>
    updateMapObject.mutate(
      { id, patch: { latitude: lat, longitude: lng } },
      { onError: (e) => Alert.alert('이동 저장 실패', friendlyError(e)) }
    );
  const undoDraw = () => {
    const last = drawnIds[drawnIds.length - 1];
    if (!last) return;
    setDrawnIds((ids) => ids.slice(0, -1));
    removeMapObject.mutate(last, {
      onError: (e) => Alert.alert('되돌리기 실패', friendlyError(e)),
    });
  };
  // 선택 객체 크기 조정(payload.scale 배수). 거대/화면밖 객체도 항상 동작(툴바 방식).
  const resizeSelected = (factor: number) => {
    if (!selectedObject) return;
    const prev = (selectedObject.payload?.scale as number) ?? 1;
    updateMapObject.mutate(
      {
        id: selectedObject.id,
        patch: { payload: { ...(selectedObject.payload ?? {}), scale: prev * factor } },
      },
      { onError: (e) => Alert.alert('크기 저장 실패', friendlyError(e)) }
    );
  };
  const deleteSelected = () => {
    if (!selectedObject) return;
    removeMapObject.mutate(selectedObject.id, {
      onSuccess: () => setSelectedObjectId(null),
      onError: (e) => Alert.alert('삭제 실패', friendlyError(e)),
    });
  };

  return {
    objects,
    selectedObject,
    selectedObjectId,
    stickerMode,
    stickerEmoji,
    setStickerEmoji,
    penMode,
    canUndo: drawnIds.length > 0,
    togglePen,
    toggleSticker,
    stopTools,
    closeForPlace,
    selectObject,
    placeSticker,
    saveStroke,
    moveObject,
    undoDraw,
    resizeSelected,
    deleteSelected,
  };
}
