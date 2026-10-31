import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadows, spacing, typography } from '../constants/theme';
import { useAuth } from '../hooks/useAuthState';
import { useInks } from '../hooks/useInks';
import { useMapStyle } from '../hooks/useMapStyle';
import { reportMessage } from '../services/monitoring';
import { Button } from './Button';
import { Icon } from './Icon';
import { MapWebView, type MapCamera, type MapWebViewHandle } from './MapWebView';
import {
  MapHostProvider,
  type DrawTool,
  type MapBoardData,
  type MapCallbacks,
  type MapHostController,
} from './MapHostContext';

const EMPTY_DATA: MapBoardData = { places: [], reactions: [], memos: [], objects: [] };

// 보드별 마지막 카메라(앱을 껐다 켜도 그 자리). 최근 것만 남긴다.
const CAMERA_STORE_KEY = 'map-cameras';
const CAMERA_STORE_MAX = 50;
// 보드를 바꾼 직후 잠깐은 이전 보드에서 늦게 온 카메라 보고를 버린다(지도 쪽 400ms 모음 + 여유).
const CAMERA_SWITCH_GUARD_MS = 600;
type CameraStore = Record<string, MapCamera & { at: number }>;
// 지도 펼치기 연출은 보드마다 하루 한 번(매번 보면 기다리게 된다 — docs/Experience Design.md ②). 보드 → 마지막으로 펼친 날.
const UNFOLD_STORE_KEY = 'map-unfolded';
type UnfoldStore = Record<string, string>;

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function cameraFrom(store: CameraStore, boardId: string | null): MapCamera | null {
  const saved = boardId ? store[boardId] : undefined;
  return saved ? { lng: saved.lng, lat: saved.lat, zoom: saved.zoom } : null;
}

// 싱글톤 지도 호스트: WebView+MapLibre 인스턴스를 앱 수명 동안 1개만 유지한다.
// 네비게이터 "뒤"(최하단 absoluteFill)에 깔리고, 포커스된 BoardDetail이 컨트롤러로 데이터만 교체한다.
// MapWebView 는 거의 그대로 재사용 — 컨트롤러 setter가 상태를 바꾸면 기존 증분 주입 effect가 동작.
export function MapHost({ children }: { children: ReactNode }) {
  const [boardData, setBoardData] = useState<MapBoardData>(EMPTY_DATA);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  // 필통에서 든 도구(null = 손 — 지도 이동)
  const [drawTool, setDrawTool] = useState<DrawTool | null>(null);
  // 작성자 색 구분 기준(나 · 지금 상대 · 그 밖). MapHost 는 AuthProvider 안쪽에 있다(App.tsx).
  const { session, workspace } = useAuth();
  const myUserId = session?.user?.id ?? null;
  const partnerUserId =
    workspace?.status === 'active'
      ? workspace.user_a_id === myUserId
        ? workspace.user_b_id
        : workspace.user_a_id
      : null;
  // 각자 고른 잉크(나 · 지금 상대 · 그 밖=회색)
  const inks = useInks();
  // 지도 바탕(종이 지도) — 설정에서 바꾸면 바로 갈아 끼운다
  const mapStyle = useMapStyle();

  // 현재 보드 토큰(잔상 가드)과 콜백(ref 라우팅 — 재렌더 없이 최신 콜백 호출).
  const boardIdRef = useRef<string | null>(null);
  const callbacksRef = useRef<MapCallbacks>({});
  const mapRef = useRef<MapWebViewHandle>(null);

  // 보드별 카메라 기억: 메모리 + AsyncStorage(잠깐 모아서 저장)
  const camerasRef = useRef<CameraStore>({});
  const cameraSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boardSwitchedAt = useRef(0);
  // 마지막으로 보고된 지도 가운데(보드 전환 가드와 무관하게 항상 갱신) — 핀 확정 위치
  const lastCenterRef = useRef<{ lat: number; lng: number; at: number } | null>(null);

  const unfoldedRef = useRef<UnfoldStore>({});

  useEffect(() => {
    AsyncStorage.getItem(CAMERA_STORE_KEY)
      .then((raw) => {
        if (raw)
          camerasRef.current = { ...(JSON.parse(raw) as CameraStore), ...camerasRef.current };
      })
      .catch(() => {});
    AsyncStorage.getItem(UNFOLD_STORE_KEY)
      .then((raw) => {
        // 오늘 펼친 것만 남긴다(지난 날짜는 다시 펼칠 거라 들고 있을 필요가 없다)
        const today = todayKey();
        const saved = raw ? (JSON.parse(raw) as UnfoldStore) : {};
        const kept = Object.fromEntries(Object.entries(saved).filter(([, day]) => day === today));
        unfoldedRef.current = { ...kept, ...unfoldedRef.current };
      })
      .catch(() => {});
    return () => {
      if (cameraSaveTimer.current) clearTimeout(cameraSaveTimer.current);
    };
  }, []);

  const onCamera = useCallback((camera: MapCamera) => {
    lastCenterRef.current = { lat: camera.lat, lng: camera.lng, at: Date.now() };
    const boardId = boardIdRef.current;
    if (!boardId || Date.now() - boardSwitchedAt.current < CAMERA_SWITCH_GUARD_MS) return;
    camerasRef.current[boardId] = { ...camera, at: Date.now() };
    if (cameraSaveTimer.current) clearTimeout(cameraSaveTimer.current);
    cameraSaveTimer.current = setTimeout(() => {
      const recent = Object.entries(camerasRef.current)
        .sort((a, b) => b[1].at - a[1].at)
        .slice(0, CAMERA_STORE_MAX);
      camerasRef.current = Object.fromEntries(recent);
      AsyncStorage.setItem(CAMERA_STORE_KEY, JSON.stringify(camerasRef.current)).catch(() => {});
    }, 1000);
  }, []);

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
    // 다시 띄운 지도(다시 시도·크래시 복구)도 지금 보드의 마지막 카메라로
    mapRef.current?.setCamera(cameraFrom(camerasRef.current, boardIdRef.current));
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
        setDrawTool(null); // 이전 보드에서 들고 있던 도구 내려놓기.
        mapRef.current?.setFocus(null); // 이전 보드의 카메라 고정 해제.
        boardSwitchedAt.current = Date.now();
        mapRef.current?.setCamera(cameraFrom(camerasRef.current, boardId)); // 이 보드에서 마지막으로 보던 자리(없으면 장소 기준).
        // 오늘 처음 여는 보드면 종이 지도 펼치기(타일이 뜨는 동안 접힌 종이로 가려 준다). 카메라를 맞춘 다음에.
        const today = todayKey();
        if (unfoldedRef.current[boardId] !== today) {
          unfoldedRef.current[boardId] = today;
          AsyncStorage.setItem(UNFOLD_STORE_KEY, JSON.stringify(unfoldedRef.current)).catch(
            () => {}
          );
          mapRef.current?.unfold();
        }
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
      setDrawTool(boardId, tool) {
        if (boardIdRef.current !== boardId) return;
        setDrawTool(tool);
      },
      exportCard(options) {
        return mapRef.current?.exportCard(options) ?? Promise.resolve(null);
      },
      dropPin(boardId, placeId) {
        if (boardIdRef.current !== boardId) return;
        mapRef.current?.dropPin(placeId);
      },
      getCenter() {
        return lastCenterRef.current;
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
            partnerUserId={partnerUserId}
            inks={inks}
            mapStyle={mapStyle}
            onCamera={onCamera}
            drawTool={drawTool}
            onMarkerPress={(id) => callbacksRef.current.onMarkerPress?.(id)}
            onMapPress={(p) => callbacksRef.current.onMapPress?.(p)}
            onObjectPress={(id, p) => callbacksRef.current.onObjectPress?.(id, p)}
            onObjectMove={(id, lat, lng) => callbacksRef.current.onObjectMove?.(id, lat, lng)}
            onDrawEnd={(stroke) => callbacksRef.current.onDrawEnd?.(stroke)}
            onReady={onMapReady}
            onFatal={onMapFatal}
          />
          {mapFailed ? (
            <View style={styles.failWrap} pointerEvents="box-none">
              <View style={styles.failCard}>
                <Icon name="fold" size={28} color={colors.textMuted} />
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
    backgroundColor: colors.bg,
  },
  failCard: {
    alignSelf: 'stretch',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    ...shadows.paper,
  },
  failTitle: {
    ...typography.title,
    color: colors.textStrong,
    marginTop: spacing.sm,
  },
  failDesc: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  failButton: {
    alignSelf: 'stretch',
    marginTop: spacing.lg,
  },
});
