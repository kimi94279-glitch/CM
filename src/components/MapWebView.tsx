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
import { buildMapHtml, safeJson, toMapPlaces, type MapPlace } from './mapWebViewHtml';

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
}

// 지리 객체 → WebView 렌더용 슬림 형태(필요 필드만).
// 낙관적 임시 객체(temp-*, useAddMapObject)는 created_by 가 비어 있지만 방금 내가 놓은 것이다.
function toRenderObjects(objects: MapObject[], myId: string | null) {
  return objects.map((o) => ({
    id: o.id,
    type: o.type,
    latitude: o.latitude,
    longitude: o.longitude,
    payload: o.payload,
    zoom_level: o.zoom_level, // world-space 스케일 기준: 생성 당시 줌 레벨
    mine: o.created_by === myId || o.id.startsWith('temp-'),
  }));
}

// 장소별 반응 이모지(작성자별, 유니크). 카운트는 미표시.
type ReactionGroups = Record<string, { mine: string[]; partner: string[] }>;

// 반응(PlaceReaction[]) → { placeId: { mine: [이모지], partner: [이모지] } }.
function toReactionMap(reactions: PlaceReaction[], myId: string | null): ReactionGroups {
  const out: ReactionGroups = {};
  for (const r of reactions) {
    const emoji = REACTION_EMOJI[r.reaction_type];
    if (!emoji) continue;
    const group = out[r.place_id] ?? (out[r.place_id] = { mine: [], partner: [] });
    const arr = r.user_id === myId ? group.mine : group.partner;
    if (!arr.includes(emoji)) arr.push(emoji);
  }
  return out;
}

// 핀 위 말풍선: 장소별 작성자당 최신 1개(최대 2개, 오래된 → 최근 순). 전체 대화는 핀 바에서 본다.
type MemoBubbles = Record<string, { text: string; mine: boolean }[]>;

// 메모(PlaceMemo[]) → { placeId: [{ text, mine }] }. 낙관적 임시 메모(temp-*)는 내 것.
function toMemoMap(memos: PlaceMemo[], myId: string | null): MemoBubbles {
  const latest = new Map<string, { memo: PlaceMemo; mine: boolean }>();
  for (const m of memos) {
    const mine = m.user_id === myId || m.id.startsWith('temp-');
    const key = `${m.place_id}:${mine ? 'me' : 'partner'}`;
    const prev = latest.get(key);
    if (!prev || prev.memo.created_at <= m.created_at) latest.set(key, { memo: m, mine });
  }
  const out: MemoBubbles = {};
  [...latest.values()]
    .sort((a, b) => a.memo.created_at.localeCompare(b.memo.created_at))
    .forEach(({ memo, mine }) => {
      (out[memo.place_id] ?? (out[memo.place_id] = [])).push({ text: memo.content, mine });
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
}

// 프로덕션 지도 컴포넌트: WebView + MapLibre GL JS (OpenFreeMap positron, 키리스).
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

  // P1: html 은 마운트 1회만 생성(이후 source 불변 → places 변경 시 WebView 전체 reload 방지).
  // 초기 places 는 베이크되어 첫 페인트에 반영되고, 이후 변경은 injectJavaScript 증분 갱신.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const html = useMemo(() => buildMapHtml(toMapPlaces(places, myUserId)), []);

  // places → WebView 증분 반영(마커/폴리라인/카메라만 갱신). ready 이전이면 최신값만 큐에 보관.
  const pushPlaces = useCallback((arr: MapPlace[]) => {
    webRef.current?.injectJavaScript(
      `window.renderPlaces && window.renderPlaces(${safeJson(arr)}); true;`
    );
  }, []);

  useEffect(() => {
    const arr = toMapPlaces(places, myUserId);
    if (readyRef.current) {
      pushPlaces(arr);
    } else {
      pendingRef.current = arr;
    }
  }, [places, myUserId, pushPlaces]);

  // reactions → WebView 증분 반영(배지만 갱신). ready 이전이면 최신값만 큐에 보관.
  const pushReactions = useCallback((m: ReactionGroups) => {
    webRef.current?.injectJavaScript(
      `window.renderReactions && window.renderReactions(${safeJson(m)}); true;`
    );
  }, []);

  useEffect(() => {
    const m = toReactionMap(reactions ?? [], myUserId);
    if (readyRef.current) {
      pushReactions(m);
    } else {
      reactionPendingRef.current = m;
    }
  }, [reactions, myUserId, pushReactions]);

  // memos → WebView 증분 반영(핀 위 말풍선만 갱신). ready 이전이면 최신값만 큐에 보관.
  const pushMemos = useCallback((m: MemoBubbles) => {
    webRef.current?.injectJavaScript(
      `window.renderMemos && window.renderMemos(${safeJson(m)}); true;`
    );
  }, []);

  useEffect(() => {
    const m = toMemoMap(memos ?? [], myUserId);
    if (readyRef.current) {
      pushMemos(m);
    } else {
      memoPendingRef.current = m;
    }
  }, [memos, myUserId, pushMemos]);

  // objects → WebView 증분 반영(P0: sticker만 렌더). ready 이전이면 최신값만 큐에 보관.
  const pushObjects = useCallback((arr: ReturnType<typeof toRenderObjects>) => {
    webRef.current?.injectJavaScript(
      `window.renderObjects && window.renderObjects(${safeJson(arr)}); true;`
    );
  }, []);

  useEffect(() => {
    const arr = toRenderObjects(objects ?? [], myUserId);
    if (readyRef.current) {
      pushObjects(arr);
    } else {
      objectPendingRef.current = arr;
    }
  }, [objects, myUserId, pushObjects]);

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
    }),
    []
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
      style={styles.web}
    />
  );
});

const styles = StyleSheet.create({
  web: { flex: 1, backgroundColor: colors.bg },
});
