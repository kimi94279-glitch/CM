import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../constants/theme';
import { usePendingInvite } from '../hooks/usePendingInvite';

// 로그인·가입·프로필 단계에서 "받은 초대를 기억하고 있다"고 알려 준다. 기억한 코드가 없으면 그리지 않는다.
export function PendingInviteNote() {
  const { token } = usePendingInvite();
  if (!token) return null;
  return (
    <View style={styles.box}>
      <Text style={styles.text}>✏️ 받은 초대를 기억해 둘게요. 시작하면 바로 이어서 연결돼요.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.field,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  text: {
    ...typography.caption,
    color: colors.textStrong,
  },
});
