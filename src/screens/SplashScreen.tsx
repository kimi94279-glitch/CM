import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Icon } from '../components/Icon';
import { colors, spacing } from '../constants/theme';

// 앱을 여는 동안(로그인 상태 확인). 영문 로고·따옴표 친 랜덤 문구 대신 접힌 지도 하나만 — 앱 이름은 아직 정하지 않았다.
export function SplashScreen() {
  return (
    <View style={styles.container} accessible accessibilityLabel="여는 중">
      <Icon name="fold" size={40} color={colors.textStrong} />
      <ActivityIndicator style={styles.loader} color={colors.textMuted} />
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
  loader: {
    marginTop: spacing.lg,
  },
});
