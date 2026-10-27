import React, { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../constants/theme';
import { useAuth } from '../hooks/useAuthState';
import { reportMessage } from '../services/monitoring';
import { Button } from './Button';
import { MapWebView, type MapWebViewHandle } from './MapWebView';
import {
  MapHostProvider,
  type MapBoardData,
  type MapCallbacks,
  type MapHostController,
} from './MapHostContext';

const EMPTY_DATA: MapBoardData = { places: [], reactions: [], memos: [], objects: [] };

// 싱글톤 지도 호스트: WebView+MapLibre 인스턴스를 앱 수명 동안 1개만 유지한다.
// 네비게이터 "뒤"(최하단 absoluteFill)에 깔리고, 포커스된 BoardDetail이 컨트롤러로 데이터만 교체한다.
// MapWebView 는 거의 그대로 재사용 — 컨트롤러 setter가 상태를 바꾸면 기존 증분 주입 effect가 동작.
export function MapHost({ children }: { children: ReactNode }) {
  const [boardData, setBoardData] = useState<MapBoardData>(EMPTY_DATA);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [penMode, setPenMode] = useState(false);
  // 작성자 색 구분 기준(나/상대). MapHost 는 AuthProvider 안쪽에 있다(App.tsx).
  const { session } = useAuth();
  const myUserId = session?.user?.id ?? null;

  // 현재 보드 토큰(잔상 가드)과 콜백(ref 라우팅 — 재렌더 없이 최신 콜백 호출).
  const boardIdRef = useRef<string | null>(null);
  const callbacksRef = useRef<MapCallbacks>({});
  const mapRef = useRef<MapWebViewHandle>(null);

  // 지도 안정성: 못 뜨면 실패 화면 → "다시 시도" 로 WebView 를 새로 띄운다(key 교체 = 처음부터 다시).
  // WebView 프로세스가 죽은 경우(crash)는 한 번은 조용히 다시 띄우고, 또 죽으면 실패 화면.
  const [mapKey, setMapKey] = useState(0);
  const [mapFailed, setMapFailed] = useState(false);
  const crashRetried = useRef(false);

  const reloadMap = useCallback(() => {
    setMapFailed(false);
    setMapKey((k) => k + 1);
  }, []);

  const onMapReady = useCallback(() => {
    crashRetried.current = false;
    setMapFailed(false);
  }, []);

  const onMapFatal = useCallback(
    (stage: string) => {
      if (stage === 'crash' && !crashRetried.current) {
        crashRetried.current = true;
        reloadMap();
        return;
      }
      reportMessage(`map fatal: ${stage}`);
      setMapFailed(true);
    },
    [reloadMap]
  );

  const controller = useMemo<MapHostController>(
    () => ({
      beginBoard(boardId) {
        boardIdRef.current = boardId;
        callbacksRef.current = {};
        setSelectedObjectId(null);
        setPenMode(false); // 이전 보드의 펜 모드 해제.
        mapRef.current?.setFocus(null); // 이전 보드의 카메라 고정 해제.
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
      focus(boardId, lat, lng) {
        if (boardIdRef.current !== boardId) return;
        mapRef.current?.setFocus({ lat, lng });
      },
      setPenMode(boardId, on) {
        if (boardIdRef.current !== boardId) return;
        setPenMode(on);
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
            key={mapKey}
            ref={mapRef}
            places={boardData.places}
            reactions={boardData.reactions}
            memos={boardData.memos}
            objects={boardData.objects}
            selectedObjectId={selectedObjectId}
            myUserId={myUserId}
            penMode={penMode}
            onMarkerPress={(id) => callbacksRef.current.onMarkerPress?.(id)}
            onMapPress={(p) => callbacksRef.current.onMapPress?.(p)}
            onObjectPress={(id) => callbacksRef.current.onObjectPress?.(id)}
            onObjectMove={(id, lat, lng) => callbacksRef.current.onObjectMove?.(id, lat, lng)}
            onDrawEnd={(stroke) => callbacksRef.current.onDrawEnd?.(stroke)}
            onReady={onMapReady}
            onFatal={onMapFatal}
          />
          {mapFailed ? (
            <View style={styles.failWrap} pointerEvents="box-none">
              <View style={styles.failCard}>
                <Text style={styles.failTitle}>지도를 불러오지 못했어요</Text>
                <Text style={styles.failDesc}>인터넷 연결을 확인하고 다시 시도해 주세요.</Text>
                <Button title="다시 시도" onPress={reloadMap} style={styles.failButton} />
              </View>
            </View>
          ) : null}
        </View>
        {/* 네비게이터(위층). BoardDetail은 투명+box-none으로 지도를 노출/통과시킨다. */}
        {children}
      </View>
    </MapHostProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  failWrap: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surfaceMuted,
  },
  failCard: {
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    alignItems: 'center',
  },
  failTitle: {
    ...typography.title,
    color: colors.textStrong,
    textAlign: 'center',
  },
  failDesc: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  failButton: {
    alignSelf: 'stretch',
    marginTop: spacing.lg,
  },
});
