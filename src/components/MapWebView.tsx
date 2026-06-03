import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { colors, spacing, typography } from '../constants/theme';
import type { Place } from '../types/models';
import { buildMapHtml, toMapPlaces } from './mapWebViewHtml';

const KAKAO_JS_KEY = process.env.EXPO_PUBLIC_KAKAO_JS_KEY ?? '';

interface MapWebViewProps {
  places: Place[];
  onMarkerPress?: (placeId: string) => void;
}

// 프로덕션 지도 컴포넌트: WebView + Kakao JS SDK.
// places 는 order_index 기준으로 정렬되어 마커/폴리라인으로 렌더된다.
export function MapWebView({ places, onMarkerPress }: MapWebViewProps) {
  // places 가 바뀔 때만 HTML 재생성
  const html = useMemo(() => buildMapHtml(KAKAO_JS_KEY, toMapPlaces(places)), [places]);

  const handleMessage = (e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
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
      originWhitelist={['*']}
      javaScriptEnabled
      domStorageEnabled
      mixedContentMode="always"
      source={{ html }}
      onMessage={handleMessage}
      style={styles.web}
    />
  );
}

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
