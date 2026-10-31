import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { Linking, StyleSheet } from 'react-native';
import { WebView, type WebViewMessageEvent, type WebViewNavigation } from 'react-native-webview';

import { REACTION_EMOJI } from '../constants/reactions';
import { colors } from '../constants/theme';
import type { MapObject, Place, PlaceMemo, PlaceReaction } from '../types/models';
import type { DrawStroke } from './MapHostContext';
import type { PeopleInks } from '../hooks/useInks';
import { whoOf, type Who } from '../utils/who';
import { buildMapStyle, type MapStyleName } from './mapStyles';
import { buildMapHtml, safeJson, toMapInks, toMapPlaces, type MapPlace } from './mapWebViewHtml';

interface MapWebViewProps {
  places: Place[];
  reactions?: PlaceReaction[];
  memos?: PlaceMemo[];
  objects?: MapObject[];
  onMarkerPress?: (placeId: string) => void;
  // 핀 외 빈 지도(배경) 탭. point(좌표/레벨)는 객체 배치용 — 없으면 단순 배경 탭(팔레트 닫기 등).
  onMapPress?: (point?: { lat: number; lng: number; level: number }) => void;
  // 객체(스티커) 탭 → 편집 선택. 드래그 이동 종료 → 새 좌표 저장.
  onObjectPress?: (id: string) => void;
  onObjectMove?: (id: string, lat: number, lng: number) => void;
  // 현재 편집 선택된 객체 id(선택 링 표시). null = 해제.
  selectedObjectId?: string | null;
  // 내 uid — 핀/반응/스티커를 작성자 색(나/상대)으로 구분하는 기준.
  myUserId?: string | null;
  // 지금 같이 그리는 사람 uid — 그 밖의 작성자(예전 상대·탈퇴)는 회색으로 구분한다.
  partnerUserId?: string | null;
  // 사람 구분별 잉크(각자 고른 색, useInks). 바뀌면 지도를 다시 칠한다.
  inks: PeopleInks;
  // 지도 바탕(종이 지도 3종, mapStyles). 바뀌면 카메라·핀은 그대로 두고 바탕만 갈아 끼운다.
  mapStyle: MapStyleName;
  // 카메라가 멈출 때마다(보드별로 기억해 두었다가 다시 들어오면 그 자리로)
  onCamera?: (camera: MapCamera) => void;
  // 펜 모드: 켜면 지도 제스처가 잠기고 손가락 선이 onDrawEnd 로 올라온다.
  penMode?: boolean;
  onDrawEnd?: (stroke: DrawStroke) => void;
  // 지도가 처음 뜸 / 못 뜸. stage: style(오프라인·스타일 서버) · timeout · sdk · crash(WebView 프로세스 종료)
  onReady?: () => void;
  onFatal?: (stage: string) => void;
}

// 지도 카메라(보드별 마지막 위치)
export interface MapCamera {
  lng: number;
  lat: number;
  zoom: number;
}

// WebView 'drawEnd' 메시지 검증 → DrawStroke. 형식이 어긋나면 null.
function toDrawStroke(msg: {
  points?: unknown;
  zoom?: unknown;
  width?: unknown;
}): DrawStroke | null {
  if (!Array.isArray(msg.points) || typeof msg.zoom !== 'number' || typeof msg.width !== 'number') {
    return null;
  }
  const points = msg.points.filter(
    (p): p is [number, number] =>
      Array.isArray(p) && p.length === 2 && typeof p[0] === 'number' && typeof p[1] === 'number'
  );
  return points.length >= 2 ? { points, zoom: msg.zoom, width: msg.width } : null;
}

// 지리 객체 → WebView 렌더용 슬림 형태(필요 필드만).
// 낙관적 임시 객체(temp-*, useAddMapObject)는 created_by 가 비어 있지만 방금 내가 놓은 것이다.
function toRenderObjects(objects: MapObject[], myId: string | null, partnerId: string | null) {
  return objects.map((o) => ({
    id: o.id,
    type: o.type,
    latitude: o.latitude,
    longitude: o.longitude,
    payload: o.payload,
    zoom_level: o.zoom_level, // world-space 스케일 기준: 생성 당시 줌 레벨
    who: o.id.startsWith('temp-') ? ('me' as Who) : whoOf(o.created_by, myId, partnerId),
  }));
}

// 장소별 반응 이모지(작성자 구분별, 유니크). 카운트는 미표시.
type ReactionGroups = Record<string, Record<Who, string[]>>;

// 반응(PlaceReaction[]) → { placeId: { me: [이모지], partner: [...], other: [...] } }.
function toReactionMap(
  reactions: PlaceReaction[],
  myId: string | null,
  partnerId: string | null
): ReactionGroups {
  const out: ReactionGroups = {};
  for (const r of reactions) {
    const emoji = REACTION_EMOJI[r.reaction_type];
    if (!emoji) continue;
    const group = out[r.place_id] ?? (out[r.place_id] = { me: [], partner: [], other: [] });
    const arr = group[whoOf(r.user_id, myId, partnerId)];
    if (!arr.includes(emoji)) arr.push(emoji);
  }
  return out;
}

// 핀 위 말풍선: 장소별 작성자당 최신 1개(최대 2개, 오래된 → 최근 순). 전체 대화는 핀 바에서 본다.
type MemoBubbles = Record<string, { text: string; who: Who }[]>;

// 메모(PlaceMemo[]) → { placeId: [{ text, who }] }. 낙관적 임시 메모(temp-*)는 내 것.
function toMemoMap(memos: PlaceMemo[], myId: string | null, partnerId: string | null): MemoBubbles {
  const latest = new Map<string, { memo: PlaceMemo; who: Who }>();
  for (const m of memos) {
    const who: Who = m.id.startsWith('temp-') ? 'me' : whoOf(m.user_id, myId, partnerId);
    const key = `${m.place_id}:${who}`;
    const prev = latest.get(key);
    if (!prev || prev.memo.created_at <= m.created_at) latest.set(key, { memo: m, who });
  }
  const out: MemoBubbles = {};
  [...latest.values()]
    .sort((a, b) => a.memo.created_at.localeCompare(b.memo.created_at))
    .forEach(({ memo, who }) => {
      (out[memo.place_id] ?? (out[memo.place_id] = [])).push({ text: memo.content, who });
    });
  return out;
}

// 지도 HTML(about:blank) 밖으로 나가는 이동은 막고, http(s)만 시스템 브라우저로 연다.
// 싱글톤 WebView가 외부 페이지(예: OSM 출처 링크)로 바뀌면 앱 재시작 전까지 지도가 사라진다.
function openExternally(url: string) {
  if (/^https?:/i.test(url)) Linking.openURL(url).catch(() => {});
}

function shouldStartLoad({ url }: WebViewNavigation): boolean {
  if (url.startsWith('about:') || url.startsWith('data:')) return true;
  openExternally(url);
  return false;
}

// 상위(BoardDetailScreen)가 ref로 호출하는 명령형 API.
export interface MapWebViewHandle {
  // 카메라를 의미 있는 기준으로 되돌린다(R1: 0개=기본 중심 / 1개=센터 / 2+=fitBounds).
  recenter(): void;
  // 카메라를 특정 좌표에 고정(알림 탭 진입). 사용자가 지도를 움직이면 풀린다. null = 해제.
  setFocus(point: { lat: number; lng: number } | null): void;
  // 보드의 마지막 카메라로 맞춘다(null = 장소 기준 자동). 사용자가 움직이기 전까지 장소가 바뀌어도 그대로.
  setCamera(camera: MapCamera | null): void;
}

// 프로덕션 지도 컴포넌트: WebView + MapLibre GL JS (OpenFreeMap 벡터 + 지형 타일, 키리스 — 바탕은 mapStyles).
// places 는 order_index 기준으로 정렬되어 마커/폴리라인으로 렌더된다.
export const MapWebView = forwardRef<MapWebViewHandle, MapWebViewProps>(function MapWebView(
  {
    places,
    reactions,
    memos,
    objects,
    onMarkerPress,
    onMapPress,
    onObjectPress,
    onObjectMove,
    selectedObjectId,
    myUserId = null,
    partnerUserId = null,
    inks,
    mapStyle,
    onCamera,
    penMode = false,
    onDrawEnd,
    onReady,
    onFatal,
  },
  ref
) {
  const webRef = useRef<WebView>(null);
  // 'ready' 수신 여부와, ready 이전에 들어온 최신 places/reactions/memos/objects(큐). ready 시 1회 flush.
  const readyRef = useRef(false);
  const pendingRef = useRef<MapPlace[] | null>(null);
  const reactionPendingRef = useRef<ReactionGroups | null>(null);
  const memoPendingRef = useRef<MemoBubbles | null>(null);
  const objectPendingRef = useRef<ReturnType<typeof toRenderObjects> | null>(null);
  // 카메라 고정 큐: undefined = 대기 없음, null = 해제 대기, 좌표 = 고정 대기(앱을 알림으로 연 직후 등).
  const focusPendingRef = useRef<{ lat: number; lng: number } | null | undefined>(undefined);
  // 카메라 큐: undefined = 대기 없음. ready 전에 보드에 들어오면 여기 두었다가 맞춘다.
  const cameraPendingRef = useRef<MapCamera | null | undefined>(undefined);
  const inksPendingRef = useRef<PeopleInks | null>(null);
  // 처음 HTML 에 구운 바탕 — 이것과 같으면 다시 넣지 않는다(ready 직후 불필요한 스타일 재로드 방지).
  const appliedStyleRef = useRef<MapStyleName>(mapStyle);

  const pushCamera = useCallback((camera: MapCamera | null) => {
    webRef.current?.injectJavaScript(
      `window.setCamera && window.setCamera(${safeJson(camera)}); true;`
    );
  }, []);

  const pushInks = useCallback((next: PeopleInks) => {
    webRef.current?.injectJavaScript(
      `window.setInks && window.setInks(${safeJson(toMapInks(next))}); true;`
    );
  }, []);

  const pushFocus = useCallback((point: { lat: number; lng: number } | null) => {
    webRef.current?.injectJavaScript(
      `window.setFocus && window.setFocus(${safeJson(point)}); true;`
    );
  }, []);

  // P1: html 은 마운트 1회만 생성(이후 source 불변 → places 변경 시 WebView 전체 reload 방지).
  // 초기 places 는 베이크되어 첫 페인트에 반영되고, 이후 변경은 injectJavaScript 증분 갱신.
  const html = useMemo(
    () => buildMapHtml(toMapPlaces(places, myUserId, partnerUserId), inks, mapStyle),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // places → WebView 증분 반영(마커/폴리라인/카메라만 갱신). ready 이전이면 최신값만 큐에 보관.
  const pushPlaces = useCallback((arr: MapPlace[]) => {
    webRef.current?.injectJavaScript(
      `window.renderPlaces && window.renderPlaces(${safeJson(arr)}); true;`
    );
  }, []);

  useEffect(() => {
    const arr = toMapPlaces(places, myUserId, partnerUserId);
    if (readyRef.current) {
      pushPlaces(arr);
    } else {
      pendingRef.current = arr;
    }
  }, [places, myUserId, partnerUserId, pushPlaces]);

  // reactions → WebView 증분 반영(배지만 갱신). ready 이전이면 최신값만 큐에 보관.
  const pushReactions = useCallback((m: ReactionGroups) => {
    webRef.current?.injectJavaScript(
      `window.renderReactions && window.renderReactions(${safeJson(m)}); true;`
    );
  }, []);

  useEffect(() => {
    const m = toReactionMap(reactions ?? [], myUserId, partnerUserId);
    if (readyRef.current) {
      pushReactions(m);
    } else {
      reactionPendingRef.current = m;
    }
  }, [reactions, myUserId, partnerUserId, pushReactions]);

  // memos → WebView 증분 반영(핀 위 말풍선만 갱신). ready 이전이면 최신값만 큐에 보관.
  const pushMemos = useCallback((m: MemoBubbles) => {
    webRef.current?.injectJavaScript(
      `window.renderMemos && window.renderMemos(${safeJson(m)}); true;`
    );
  }, []);

  useEffect(() => {
    const m = toMemoMap(memos ?? [], myUserId, partnerUserId);
    if (readyRef.current) {
      pushMemos(m);
    } else {
      memoPendingRef.current = m;
    }
  }, [memos, myUserId, partnerUserId, pushMemos]);

  // objects → WebView 증분 반영(P0: sticker만 렌더). ready 이전이면 최신값만 큐에 보관.
  const pushObjects = useCallback((arr: ReturnType<typeof toRenderObjects>) => {
    webRef.current?.injectJavaScript(
      `window.renderObjects && window.renderObjects(${safeJson(arr)}); true;`
    );
  }, []);

  useEffect(() => {
    const arr = toRenderObjects(objects ?? [], myUserId, partnerUserId);
    if (readyRef.current) {
      pushObjects(arr);
    } else {
      objectPendingRef.current = arr;
    }
  }, [objects, myUserId, partnerUserId, pushObjects]);

  // 잉크 변경 → 다시 칠하기(ready 전이면 최신값만 보관)
  useEffect(() => {
    if (readyRef.current) {
      pushInks(inks);
    } else {
      inksPendingRef.current = inks;
    }
  }, [inks, pushInks]);

  // 지도 바탕 변경 → 스타일만 갈아 끼우기. ready 전이면 ready 때 맞춘다.
  const pushMapStyle = useCallback((name: MapStyleName) => {
    appliedStyleRef.current = name;
    webRef.current?.injectJavaScript(
      `window.setMapStyle && window.setMapStyle(${safeJson(buildMapStyle(name))}); true;`
    );
  }, []);
  const mapStyleRef = useRef(mapStyle);
  useEffect(() => {
    mapStyleRef.current = mapStyle;
    if (readyRef.current && appliedStyleRef.current !== mapStyle) pushMapStyle(mapStyle);
  }, [mapStyle, pushMapStyle]);

  // 펜 모드 → WebView 제스처 잠금/캔버스 표시. ready 이전 값은 ready 때 penMode 로 다시 맞춘다.
  const penModeRef = useRef(penMode);
  useEffect(() => {
    penModeRef.current = penMode;
    webRef.current?.injectJavaScript(
      `window.setPenMode && window.setPenMode(${penMode ? 'true' : 'false'}); true;`
    );
  }, [penMode]);

  // 편집 선택 변경 → WebView 선택 링 갱신. (선택은 ready 이후 사용자 상호작용이라 단순 주입)
  useEffect(() => {
    webRef.current?.injectJavaScript(
      `window.selectObject && window.selectObject(${JSON.stringify(selectedObjectId ?? null)}); true;`
    );
  }, [selectedObjectId]);

  useImperativeHandle(
    ref,
    () => ({
      recenter() {
        // ready 이전 호출 대비 가드 + injectJavaScript 마지막 표현식 true; 관례.
        webRef.current?.injectJavaScript('window.recenter && window.recenter(); true;');
      },
      setFocus(point) {
        if (readyRef.current) {
          pushFocus(point);
        } else {
          focusPendingRef.current = point;
        }
      },
      setCamera(camera) {
        if (readyRef.current) {
          pushCamera(camera);
        } else {
          cameraPendingRef.current = camera;
        }
      },
    }),
    [pushFocus, pushCamera]
  );

  const handleMessage = (e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.type === 'ready') {
        // SDK/지도 준비 완료 → 큐에 보관한 최신 places 를 1회 반영.
        readyRef.current = true;
        if (pendingRef.current) {
          pushPlaces(pendingRef.current);
          pendingRef.current = null;
        }
        if (reactionPendingRef.current) {
          pushReactions(reactionPendingRef.current);
          reactionPendingRef.current = null;
        }
        if (memoPendingRef.current) {
          pushMemos(memoPendingRef.current);
          memoPendingRef.current = null;
        }
        if (objectPendingRef.current) {
          pushObjects(objectPendingRef.current);
          objectPendingRef.current = null;
        }
        // 고정은 장소 반영 뒤에 적용해야 카메라가 그 위치에 머문다.
        if (inksPendingRef.current) {
          pushInks(inksPendingRef.current);
          inksPendingRef.current = null;
        }
        // 보드의 마지막 카메라 → 그다음 고정(알림 탭)이 있으면 고정이 이긴다.
        if (cameraPendingRef.current !== undefined) {
          pushCamera(cameraPendingRef.current);
          cameraPendingRef.current = undefined;
        }
        if (focusPendingRef.current !== undefined) {
          pushFocus(focusPendingRef.current);
          focusPendingRef.current = undefined;
        }
        if (penModeRef.current) {
          webRef.current?.injectJavaScript('window.setPenMode && window.setPenMode(true); true;');
        }
        if (appliedStyleRef.current !== mapStyleRef.current) pushMapStyle(mapStyleRef.current);
        onReady?.();
        return;
      }
      if (
        msg.type === 'camera' &&
        typeof msg.lng === 'number' &&
        typeof msg.lat === 'number' &&
        typeof msg.zoom === 'number'
      ) {
        onCamera?.({ lng: msg.lng, lat: msg.lat, zoom: msg.zoom });
        return;
      }
      if (msg.type === 'fatal') {
        onFatal?.(typeof msg.stage === 'string' ? msg.stage : 'unknown');
        return;
      }
      if (msg.type === 'drawEnd') {
        const stroke = toDrawStroke(msg);
        if (stroke) onDrawEnd?.(stroke);
        return;
      }
      if (msg.type === 'mapTap') {
        const hasPoint =
          typeof msg.lat === 'number' &&
          typeof msg.lng === 'number' &&
          typeof msg.level === 'number';
        onMapPress?.(hasPoint ? { lat: msg.lat, lng: msg.lng, level: msg.level } : undefined);
        return;
      }
      if (msg.type === 'markerClick' && typeof msg.id === 'string') {
        onMarkerPress?.(msg.id);
        return;
      }
      if (msg.type === 'objectTap' && typeof msg.id === 'string') {
        onObjectPress?.(msg.id);
        return;
      }
      if (
        msg.type === 'objectMove' &&
        typeof msg.id === 'string' &&
        typeof msg.lat === 'number' &&
        typeof msg.lng === 'number'
      ) {
        onObjectMove?.(msg.id, msg.lat, msg.lng);
      }
    } catch {
      // 진단용 메시지는 무시
    }
  };

  return (
    <WebView
      ref={webRef}
      originWhitelist={['*']}
      javaScriptEnabled
      domStorageEnabled
      mixedContentMode="always"
      source={{ html }}
      onShouldStartLoadWithRequest={shouldStartLoad}
      onOpenWindow={(e) => openExternally(e.nativeEvent.targetUrl)}
      onMessage={handleMessage}
      // WebView 프로세스가 죽으면(메모리 부족 등) 빈 화면이 남는다 → MapHost 가 다시 띄운다.
      onRenderProcessGone={() => onFatal?.('crash')}
      onContentProcessDidTerminate={() => onFatal?.('crash')}
      style={styles.web}
    />
  );
});

const styles = StyleSheet.create({
  web: { flex: 1, backgroundColor: colors.bg },
});
