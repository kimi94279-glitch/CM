import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../constants/theme';

// 데이트를 상상하게 하는 랜덤 문구 (UX_AUTH.md)
// 앱 로드 시 1회 선택한다. (렌더 순수성 유지)
const TAGLINES = ['이번 주말 어디 갈까?', '꽃 보러 갈까?', '새 카페 가볼까?', '야경 보러 갈까?'];
const TAGLINE = TAGLINES[Math.floor(Math.random() * TAGLINES.length)];

export function SplashScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Couple Map</Text>
      <Text style={styles.tagline}>{`"${TAGLINE}"`}</Text>
      <ActivityIndicator style={styles.loader} color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    ...typography.display,
    color: colors.primary,
  },
  tagline: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  loader: {
    marginTop: spacing.xl,
  },
});
