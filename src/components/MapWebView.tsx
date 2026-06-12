import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { REACTION_EMOJI } from '../constants/reactions';
import { colors, spacing, typography } from '../constants/theme';
import type { MapObject, Place, PlaceReaction } from '../types/models';
import { buildMapHtml, safeJson, toMapPlaces, type MapPlace } from './mapWebViewHtml';

const KAKAO_JS_KEY = process.env.EXPO_PUBLIC_KAKAO_JS_KEY ?? '';

interface MapWebViewProps {
  places: Place[];
  reactions?: PlaceReaction[];
  objects?: MapObject[];
  onMarkerPress?: (placeId: string) => void;
  // 핀 외 빈 지도(배경) 탭. point(좌표/레벨)는 객체 배치용 — 없으면 단순 배경 탭(팔레트 닫기 등).
  onMapPress?: (point?: { lat: number; lng: number; level: number }) => void;
}

// 지리 객체 → WebView 렌더용 슬림 형태(필요 필드만).
function toRenderObjects(objects: MapObject[]) {
  return objects.map((o) => ({
    id: o.id,
    type: o.type,
    latitude: o.latitude,
    longitude: o.longitude,
    payload: o.payload,
  }));
}

// 반응(PlaceReaction[]) → { placeId: [이모지, ...] }. (a) 유니크 이모지만(귀속·카운트 미표시).
function toReactionMap(reactions: PlaceReaction[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const r of reactions) {
    const emoji = REACTION_EMOJI[r.reaction_type];
    if (!emoji) continue;
    const arr = out[r.place_id] ?? (out[r.place_id] = []);
    if (!arr.includes(emoji)) arr.push(emoji);
  }
  return out;
}

// 상위(BoardDetailScreen)가 ref로 호출하는 명령형 API.
export interface MapWebViewHandle {
  // 카메라를 의미 있는 기준으로 되돌린다(R1: 0개=기본 중심 / 1개=센터 / 2+=fitBounds).
  recenter(): void;
}

// 프로덕션 지도 컴포넌트: WebView + Kakao JS SDK.
// places 는 order_index 기준으로 정렬되어 마커/폴리라인으로 렌더된다.
export const MapWebView = forwardRef<MapWebViewHandle, MapWebViewProps>(function MapWebView(
  { places, reactions, objects, onMarkerPress, onMapPress },
  ref
) {
  const webRef = useRef<WebView>(null);
  // 'ready' 수신 여부와, ready 이전에 들어온 최신 places/reactions/objects(큐). ready 시 1회 flush.
  const readyRef = useRef(false);
  const pendingRef = useRef<MapPlace[] | null>(null);
  const reactionPendingRef = useRef<Record<string, string[]> | null>(null);
  const objectPendingRef = useRef<ReturnType<typeof toRenderObjects> | null>(null);

  // P1: html 은 마운트 1회만 생성(이후 source 불변 → places 변경 시 WebView 전체 reload 방지).
  // 초기 places 는 베이크되어 첫 페인트에 반영되고, 이후 변경은 injectJavaScript 증분 갱신.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const html = useMemo(() => buildMapHtml(KAKAO_JS_KEY, toMapPlaces(places)), []);

  // places → WebView 증분 반영(마커/폴리라인/카메라만 갱신). ready 이전이면 최신값만 큐에 보관.
  const pushPlaces = useCallback((arr: MapPlace[]) => {
    webRef.current?.injectJavaScript(
      `window.renderPlaces && window.renderPlaces(${safeJson(arr)}); true;`
    );
  }, []);

  useEffect(() => {
    const arr = toMapPlaces(places);
    if (readyRef.current) {
      pushPlaces(arr);
    } else {
      pendingRef.current = arr;
    }
  }, [places, pushPlaces]);

  // reactions → WebView 증분 반영(배지만 갱신). ready 이전이면 최신값만 큐에 보관.
  const pushReactions = useCallback((m: Record<string, string[]>) => {
    webRef.current?.injectJavaScript(
      `window.renderReactions && window.renderReactions(${safeJson(m)}); true;`
    );
  }, []);

  useEffect(() => {
    const m = toReactionMap(reactions ?? []);
    if (readyRef.current) {
      pushReactions(m);
    } else {
      reactionPendingRef.current = m;
    }
  }, [reactions, pushReactions]);

  // objects → WebView 증분 반영(P0: sticker만 렌더). ready 이전이면 최신값만 큐에 보관.
  const pushObjects = useCallback((arr: ReturnType<typeof toRenderObjects>) => {
    webRef.current?.injectJavaScript(
      `window.renderObjects && window.renderObjects(${safeJson(arr)}); true;`
    );
  }, []);

  useEffect(() => {
    const arr = toRenderObjects(objects ?? []);
    if (readyRef.current) {
      pushObjects(arr);
    } else {
      objectPendingRef.current = arr;
    }
  }, [objects, pushObjects]);

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
      }
    } catch {
      // 진단용 메시지는 무시
    }
  };

  if (!KAKAO_JS_KEY) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>지도 키가 설정되지 않았어요.</Text>
      </View>
    );
  }

  return (
    <WebView
      ref={webRef}
      originWhitelist={['*']}
      javaScriptEnabled
      domStorageEnabled
      mixedContentMode="always"
      source={{ html }}
      onMessage={handleMessage}
      style={styles.web}
    />
  );
});

const styles = StyleSheet.create({
  web: { flex: 1, backgroundColor: colors.bg },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  fallbackText: {
    ...typography.body,
    color: colors.textMuted,
  },
});
