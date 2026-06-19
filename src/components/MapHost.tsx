import React, { useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { MapWebView, type MapWebViewHandle } from './MapWebView';
import {
  MapHostProvider,
  type MapBoardData,
  type MapCallbacks,
  type MapHostController,
} from './MapHostContext';

const EMPTY_DATA: MapBoardData = { places: [], reactions: [], objects: [] };

// 싱글톤 지도 호스트: WebView+MapLibre 인스턴스를 앱 수명 동안 1개만 유지한다.
// 네비게이터 "뒤"(최하단 absoluteFill)에 깔리고, 포커스된 BoardDetail이 컨트롤러로 데이터만 교체한다.
// MapWebView 는 거의 그대로 재사용 — 컨트롤러 setter가 상태를 바꾸면 기존 증분 주입 effect가 동작.
export function MapHost({ children }: { children: ReactNode }) {
  const [boardData, setBoardData] = useState<MapBoardData>(EMPTY_DATA);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  // 현재 보드 토큰(잔상 가드)과 콜백(ref 라우팅 — 재렌더 없이 최신 콜백 호출).
  const boardIdRef = useRef<string | null>(null);
  const callbacksRef = useRef<MapCallbacks>({});
  const mapRef = useRef<MapWebViewHandle>(null);

  const controller = useMemo<MapHostController>(
    () => ({
      beginBoard(boardId) {
        boardIdRef.current = boardId;
        callbacksRef.current = {};
        setSelectedObjectId(null);
        setBoardData(EMPTY_DATA); // 데이터 도착 전 공백 — 이전 보드 마커 제거(잔상 1차 방어).
      },
      setData(boardId, data) {
        if (boardIdRef.current !== boardId) return; // 늦게 도착한 이전 보드 응답 차단.
        setBoardData(data);
      },
      setSelectedObjectId(boardId, id) {
        if (boardIdRef.current !== boardId) return;
        setSelectedObjectId(id);
      },
      setCallbacks(boardId, cb) {
        if (boardIdRef.current !== boardId) return;
        callbacksRef.current = cb;
      },
      recenter() {
        mapRef.current?.recenter();
      },
      show() {
        setVisible(true);
      },
      hide() {
        setVisible(false);
      },
    }),
    []
  );

  return (
    <MapHostProvider value={controller}>
      <View style={styles.root}>
        {/* 지도 레이어(최하단). 빈 영역 터치가 통과되도록 box-none, 위 화면이 투명할 때만 보임. */}
        <View
          style={[StyleSheet.absoluteFill, { opacity: visible ? 1 : 0 }]}
          pointerEvents={visible ? 'box-none' : 'none'}
        >
          <MapWebView
            ref={mapRef}
            places={boardData.places}
            reactions={boardData.reactions}
            objects={boardData.objects}
            selectedObjectId={selectedObjectId}
            onMarkerPress={(id) => callbacksRef.current.onMarkerPress?.(id)}
            onMapPress={(p) => callbacksRef.current.onMapPress?.(p)}
            onObjectPress={(id) => callbacksRef.current.onObjectPress?.(id)}
            onObjectMove={(id, lat, lng) => callbacksRef.current.onObjectMove?.(id, lat, lng)}
          />
        </View>
        {/* 네비게이터(위층). BoardDetail은 투명+box-none으로 지도를 노출/통과시킨다. */}
        {children}
      </View>
    </MapHostProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
