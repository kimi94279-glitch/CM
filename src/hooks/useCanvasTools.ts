import { useMemo, useState } from 'react';
import { Alert } from 'react-native';

import type { DrawStroke, DrawTool } from '../components/MapHostContext';
import { DEFAULT_STICKER, stickerPayload } from '../constants/stickers';
import { friendlyError } from '../utils/errors';
import { selectHaptic, tapHaptic } from '../utils/haptics';
import {
  useAddMapObject,
  useMapObjects,
  useRemoveMapObject,
  useUpdateMapObject,
} from './useMapObjects';
import { useRecentStickers } from './useRecentStickers';

// 필통의 도구: 손(아무것도 안 듦 = 지도 이동, 기본) · 연필 · 잉크 · 형광펜 · 실 자 · 스티커 · 핀. 한 번에 하나만 든다.
// 스티커·핀은 누르는 도구(한 손가락 끌기는 여전히 지도 이동), 나머지는 긋는 도구.
export type CanvasTool = 'hand' | DrawTool | 'sticker' | 'pin';

// 되돌리기 한 칸: 이 지도에서 내가 방금 만든 것(선·스티커 = 지도 객체, 핀 = 장소).
type UndoEntry = { kind: 'object' | 'place'; id: string };
const UNDO_MAX = 30;

// 지도 캔버스 도구: 필통(그리기·스티커) + 객체 편집(탭 선택 → 크기·삭제, 드래그 이동) + 되돌리기.
// 손 말고 다른 도구를 들 때 화면의 다른 바(핀 쪽지)를 닫도록 onToolOn 을 부른다.
// 되돌리기는 도구와 상관없이 이 지도에서 내가 만든 순서대로 거꾸로 지운다(2026-11-01) — 핀 지우기는 화면이 넘겨준다.
export function useCanvasTools(
  boardId: string,
  onToolOn: () => void,
  removePlace: (placeId: string) => void
) {
  const objectsQuery = useMapObjects(boardId);
  const objects = useMemo(() => objectsQuery.data ?? [], [objectsQuery.data]);
  const addMapObject = useAddMapObject(boardId);
  const updateMapObject = useUpdateMapObject(boardId);
  const removeMapObject = useRemoveMapObject(boardId);

  // 편집(Explore→Peek→Edit): 탭으로 객체 선택, 배경 탭으로 해제. 선택 시 편집 툴바 노출.
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const selectedObject = objects.find((o) => o.id === selectedObjectId) ?? null;
  const [tool, setTool] = useState<CanvasTool>('hand');
  // 든 스티커(이모지 또는 't:' + 글자 — constants/stickers). 예전에 붙인 것(🤮 등)도 저장된 그대로 보인다.
  const [sticker, setSticker] = useState(DEFAULT_STICKER);
  const recentStickers = useRecentStickers();
  const drawTool: DrawTool | null =
    tool === 'hand' || tool === 'sticker' || tool === 'pin' ? null : tool;
  const stickerMode = tool === 'sticker';
  const pinMode = tool === 'pin';
  // 되돌리기 목록(최근 것이 끝). 저장이 끝난 것만 들어간다(아직 임시 id 인 것은 지울 수 없으니).
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);
  const pushUndo = (entry: UndoEntry) => setUndoStack((s) => [...s.slice(-(UNDO_MAX - 1)), entry]);

  // 필통에서 도구 고르기. 같은 도구를 다시 누르면 손으로 돌아간다.
  const pickTool = (next: CanvasTool) => {
    const t = next === tool ? 'hand' : next;
    setTool(t);
    selectHaptic();
    if (t === 'hand') return;
    setSelectedObjectId(null);
    onToolOn();
  };
  // 핀 확정 모드처럼 지도를 움직여야 할 때: 손으로 돌아간다(그리는 도구를 들면 한 손가락으로 지도가 안 움직인다).
  const stopTools = () => setTool('hand');
  // 핀을 탭했을 때: 스티커·핀·편집 선택을 닫는다(그리는 도구는 들고 있어도 핀 탭이 안 오므로 그대로).
  const closeForPlace = () => {
    if (stickerMode || pinMode) setTool('hand');
    setSelectedObjectId(null);
  };
  const selectObject = (id: string | null) => {
    if (id && (stickerMode || pinMode)) setTool('hand');
    setSelectedObjectId(id);
  };

  // 스티커 도구로 지도 탭 → 그 자리에 지리 고정 스티커(이모지 또는 글자 딱지).
  const placeSticker = (point: { lat: number; lng: number; level: number }) => {
    tapHaptic();
    recentStickers.push(sticker);
    addMapObject
      .mutateAsync({
        type: 'sticker',
        latitude: point.lat,
        longitude: point.lng,
        zoomLevel: point.level,
        payload: stickerPayload(sticker),
      })
      .then((saved) => pushUndo({ kind: 'object', id: saved.id }))
      .catch((e) => Alert.alert('스티커를 붙이지 못했어요', friendlyError(e)));
  };
  // 한 획 → map_objects(draw) 저장. 앵커 = 첫 점, 굵기 스케일 기준 = 그린 줌(payload.z), 도구 = payload.k.
  // 저장 결과는 호출마다 받는다(mutate 의 onSuccess 는 연달아 그으면 마지막 획에만 불린다).
  const saveStroke = ({ points, zoom, width, kind }: DrawStroke) => {
    tapHaptic();
    addMapObject
      .mutateAsync({
        type: 'draw',
        latitude: points[0][1],
        longitude: points[0][0],
        zoomLevel: Math.round(zoom),
        payload: { points, z: zoom, w: width, k: kind },
      })
      .then((saved) => pushUndo({ kind: 'object', id: saved.id }))
      .catch((e) => Alert.alert('그은 선을 저장하지 못했어요', friendlyError(e)));
  };
  // 핀을 꽂으면 화면이 알려 준다(핀 저장은 usePlacing)
  const pushPlaceUndo = (placeId: string) => pushUndo({ kind: 'place', id: placeId });
  const moveObject = (id: string, lat: number, lng: number) =>
    updateMapObject.mutate(
      { id, patch: { latitude: lat, longitude: lng } },
      { onError: (e) => Alert.alert('옮긴 자리를 저장하지 못했어요', friendlyError(e)) }
    );
  // 되돌리기: 방금 만든 것부터 하나씩 지운다(선·스티커·핀).
  const undo = () => {
    const last = undoStack[undoStack.length - 1];
    if (!last) return;
    setUndoStack((s) => s.slice(0, -1));
    selectHaptic();
    if (last.kind === 'place') {
      removePlace(last.id);
      return;
    }
    if (selectedObjectId === last.id) setSelectedObjectId(null);
    removeMapObject.mutate(last.id, {
      onError: (e) => Alert.alert('되돌리지 못했어요', friendlyError(e)),
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
    const id = selectedObject.id;
    removeMapObject.mutate(id, {
      onSuccess: () => {
        setSelectedObjectId(null);
        setUndoStack((s) => s.filter((e) => e.id !== id)); // 이미 지운 것은 되돌리기 목록에서도 뺀다
      },
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
    pinMode,
    sticker,
    setSticker,
    recentStickers: recentStickers.recent,
    canUndo: undoStack.length > 0,
    pickTool,
    stopTools,
    closeForPlace,
    selectObject,
    placeSticker,
    saveStroke,
    pushPlaceUndo,
    moveObject,
    undo,
    resizeSelected,
    deleteSelected,
  };
}
