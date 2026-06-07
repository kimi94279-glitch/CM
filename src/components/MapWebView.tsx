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

import { colors, spacing, typography } from '../constants/theme';
import type { Place } from '../types/models';
import { buildMapHtml, safeJson, toMapPlaces, type MapPlace } from './mapWebViewHtml';

const KAKAO_JS_KEY = process.env.EXPO_PUBLIC_KAKAO_JS_KEY ?? '';

interface MapWebViewProps {
  places: Place[];
  onMarkerPress?: (placeId: string) => void;
}

// 상위(BoardDetailScreen)가 ref로 호출하는 명령형 API.
export interface MapWebViewHandle {
  // 카메라를 의미 있는 기준으로 되돌린다(R1: 0개=기본 중심 / 1개=센터 / 2+=fitBounds).
  recenter(): void;
}

// 프로덕션 지도 컴포넌트: WebView + Kakao JS SDK.
// places 는 order_index 기준으로 정렬되어 마커/폴리라인으로 렌더된다.
export const MapWebView = forwardRef<MapWebViewHandle, MapWebViewProps>(function MapWebView(
  { places, onMarkerPress },
  ref
) {
  const webRef = useRef<WebView>(null);
  // 'ready' 수신 여부와, ready 이전에 들어온 최신 places(큐). ready 시 1회 flush.
  const readyRef = useRef(false);
  const pendingRef = useRef<MapPlace[] | null>(null);

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
