import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../constants/theme';
import { useAuth } from '../hooks/useAuthState';
import { SocialButtons } from './SocialButtons';

// 로그인 없이 쓰는 사람(게스트)이 같이 그리기(초대 보내기·받기)를 하려 할 때 보여 준다.
// 로그인하면 같은 사용자에 계정이 붙어서, 지금까지 그린 지도가 그대로 이어진다.
export function LoginRequired() {
  const { refresh } = useAuth();
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>같이 그리려면 로그인이 필요해요</Text>
      <Text style={styles.desc}>
        로그인하면 초대를 보내고 받을 수 있어요. 지금까지 그린 지도는 그대로 이어져요.
      </Text>
      <SocialButtons mode="link" onSuccess={() => refresh()} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.xl,
  },
  title: {
    ...typography.title,
    color: colors.textStrong,
  },
  desc: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
});
