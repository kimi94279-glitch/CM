import { useEffect, useRef } from 'react';

import type { DrawTool, MapBoardData, MapHostController } from '../components/MapHostContext';

// 싱글톤 MapHost(앱 수명 동안 WebView/MapLibre 1개)를 이 보드 화면 상태에 맞춘다. 컨트롤러의 토큰 가드가
// 늦게 도착한 이전 보드 응답을 막는다. 콜백 등록(map.setCallbacks)은 화면 상태를 다루므로 화면에 둔다.
export function useBoardMapSync(
  map: MapHostController,
  boardId: string,
  {
    isFocused,
    data,
    focusTarget,
    focusNonce,
    selectedObjectId,
    drawTool,
  }: {
    isFocused: boolean;
    data: MapBoardData;
    // 알림 탭 진입 대상 좌표(nonce 당 1회 카메라 고정). 장소 목록이 아직 없으면 null → 도착하면 그때 적용.
    focusTarget: { lat: number; lng: number } | null;
    focusNonce: number | null;
    selectedObjectId: string | null;
    drawTool: DrawTool | null;
  }
) {
  // 보드 진입(마운트/보드 변경) → 토큰 설정 + 이전 보드 오버레이 clear(잔상 가드). 보드당 1회.
  useEffect(() => {
    map.beginBoard(boardId);
  }, [boardId, map]);

  // 포커스 전환 → 표시/숨김만. 데이터/카메라와 분리 → PlaceAdd 왕복 시 팬/줌 보존.
  useEffect(() => {
    if (isFocused) map.show();
    else map.hide();
  }, [isFocused, map]);

  // 보드 데이터 → 지도 주입(데이터 변경 시에만, focus 비의존). renderPlaces가 카메라까지 정렬.
  const { places, reactions, memos, objects } = data;
  useEffect(() => {
    map.setData(boardId, { places, reactions, memos, objects });
  }, [boardId, places, reactions, memos, objects, map]);

  // 알림 탭 진입: 대상 좌표에 카메라 고정(지도 = 외부 시스템이라 effect). nonce 당 1회.
  const handledFocus = useRef<number | null>(null);
  useEffect(() => {
    if (focusNonce === null || !focusTarget || handledFocus.current === focusNonce) return;
    handledFocus.current = focusNonce;
    map.focus(boardId, focusTarget.lat, focusTarget.lng);
  }, [focusNonce, focusTarget, boardId, map]);

  // 편집 선택(선택 링) 동기화.
  useEffect(() => {
    map.setSelectedObjectId(boardId, selectedObjectId);
  }, [boardId, selectedObjectId, map]);

  // 든 도구 → 한 손가락은 그리기(지도 끌기 잠금). 다른 화면으로 가면(포커스 해제) 도구를 내려놓는다.
  useEffect(() => {
    map.setDrawTool(boardId, isFocused ? drawTool : null);
  }, [boardId, drawTool, isFocused, map]);
}
