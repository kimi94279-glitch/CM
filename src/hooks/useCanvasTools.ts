import { useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';

import type { DrawStroke, DrawTool } from '../components/MapHostContext';
import { friendlyError } from '../utils/errors';
import { selectHaptic, tapHaptic } from '../utils/haptics';
import {
  useAddMapObject,
  useMapObjects,
  useRemoveMapObject,
  useUpdateMapObject,
} from './useMapObjects';

// 스티커 셋(지리 고정 객체 — 지도에 붙이는 것들). 저장은 이모지 문자열이라 예전에 붙인 것(🤮 등)도 그대로 보인다.
export const STICKER_EMOJIS = ['❤️', '⭐', '☕', '🍜', '🌳', '📸', '⛺'];

// 필통의 도구: 손(지도 이동, 기본) · 연필 · 잉크 · 형광펜 · 실 자 · 스티커. 한 번에 하나만 든다.
export type CanvasTool = 'hand' | DrawTool | 'sticker';

// 지도 캔버스 도구: 필통(그리기·스티커) + 객체 편집(탭 선택 → 크기·삭제, 드래그 이동).
// 손 말고 다른 도구를 들 때 화면의 다른 바(핀 쪽지)를 닫도록 onToolOn 을 부른다.
export function useCanvasTools(boardId: string, onToolOn: () => void) {
  const objectsQuery = useMapObjects(boardId);
  const objects = useMemo(() => objectsQuery.data ?? [], [objectsQuery.data]);
  const addMapObject = useAddMapObject(boardId);
  const updateMapObject = useUpdateMapObject(boardId);
  const removeMapObject = useRemoveMapObject(boardId);

  // 편집(Explore→Peek→Edit): 탭으로 객체 선택, 배경 탭으로 해제. 선택 시 편집 툴바 노출.
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const selectedObject = objects.find((o) => o.id === selectedObjectId) ?? null;
  const [tool, setTool] = useState<CanvasTool>('hand');
  const [stickerEmoji, setStickerEmoji] = useState('❤️');
  const drawTool: DrawTool | null = tool === 'hand' || tool === 'sticker' ? null : tool;
  const stickerMode = tool === 'sticker';
  // 이번에 손에 든 그리기 도구로 저장된 내 선(되돌리기용, 최근 것이 끝). 손으로 돌아오면 비운다.
  const [drawnIds, setDrawnIds] = useState<string[]>([]);
  // 손으로 돌아갈 때마다 바뀌는 번호 — 그 뒤에 저장이 끝난 선은 되돌리기 목록에 넣지 않는다.
  const drawSession = useRef(0);

  // 필통에서 도구 고르기. 같은 도구를 다시 누르면 손으로 돌아간다.
  const pickTool = (next: CanvasTool) => {
    const t = next === tool ? 'hand' : next;
    setTool(t);
    selectHaptic();
    if (t === 'hand') {
      drawSession.current += 1;
      setDrawnIds([]);
      return;
    }
    setSelectedObjectId(null);
    onToolOn();
  };
  // 핀 확정 모드처럼 지도를 움직여야 할 때: 손으로 돌아간다(그리는 도구를 들면 한 손가락으로 지도가 안 움직인다).
  const stopTools = () => {
    drawSession.current += 1;
    setTool('hand');
    setDrawnIds([]);
  };
  // 핀을 탭했을 때: 스티커·편집 선택을 닫는다(그리는 도구는 들고 있어도 핀 탭이 안 오므로 그대로).
  const closeForPlace = () => {
    if (tool === 'sticker') setTool('hand');
    setSelectedObjectId(null);
  };
  const selectObject = (id: string | null) => {
    if (id && tool === 'sticker') setTool('hand');
    setSelectedObjectId(id);
  };

  // 스티커 도구로 지도 탭 → 그 자리에 지리 고정 스티커.
  const placeSticker = (point: { lat: number; lng: number; level: number }) => {
    tapHaptic();
    addMapObject
      .mutateAsync({
        type: 'sticker',
        latitude: point.lat,
        longitude: point.lng,
        zoomLevel: point.level,
        payload: { emoji: stickerEmoji },
      })
      .catch((e) => Alert.alert('스티커를 붙이지 못했어요', friendlyError(e)));
  };
  // 한 획 → map_objects(draw) 저장. 앵커 = 첫 점, 굵기 스케일 기준 = 그린 줌(payload.z), 도구 = payload.k.
  // 저장 결과는 호출마다 받는다(mutate 의 onSuccess 는 연달아 그으면 마지막 획에만 불린다).
  const saveStroke = ({ points, zoom, width, kind }: DrawStroke) => {
    tapHaptic();
    const session = drawSession.current;
    addMapObject
      .mutateAsync({
        type: 'draw',
        latitude: points[0][1],
        longitude: points[0][0],
        zoomLevel: Math.round(zoom),
        payload: { points, z: zoom, w: width, k: kind },
      })
      .then((saved) => {
        if (session === drawSession.current) setDrawnIds((ids) => [...ids, saved.id]);
      })
      .catch((e) => Alert.alert('그은 선을 저장하지 못했어요', friendlyError(e)));
  };
  const moveObject = (id: string, lat: number, lng: number) =>
    updateMapObject.mutate(
      { id, patch: { latitude: lat, longitude: lng } },
      { onError: (e) => Alert.alert('옮긴 자리를 저장하지 못했어요', friendlyError(e)) }
    );
  const undoDraw = () => {
    const last = drawnIds[drawnIds.length - 1];
    if (!last) return;
    setDrawnIds((ids) => ids.slice(0, -1));
    removeMapObject.mutate(last, {
      onError: (e) => Alert.alert('선을 지우지 못했어요', friendlyError(e)),
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
      { onError: (e) => Alert.alert('바꾼 크기를 저장하지 못했어요', friendlyError(e)) }
    );
  };
  const deleteSelected = () => {
    if (!selectedObject) return;
    removeMapObject.mutate(selectedObject.id, {
      onSuccess: () => setSelectedObjectId(null),
      onError: (e) => Alert.alert('지우지 못했어요', friendlyError(e)),
    });
  };

  return {
    objects,
    selectedObject,
    selectedObjectId,
    tool,
    drawTool,
    stickerMode,
    stickerEmoji,
    setStickerEmoji,
    canUndo: drawnIds.length > 0,
    pickTool,
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
