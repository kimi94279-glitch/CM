import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../constants/theme';

// 지도 아래쪽 가운데에 뜨는 바(핀 반응·스티커·펜·편집 공용 틀). box-none 컨테이너 + 가운데 알약만 터치 수신.
// above = 알약 위에 얹을 카드(메모 입력 등), hint = 알약 아래 안내 한 줄. 끝에 ✕ 닫기.
export function FloatingBar({
  bottom,
  above,
  hint,
  onClose,
  closeLabel,
  children,
}: {
  bottom: number;
  above?: React.ReactNode;
  hint?: string;
  onClose: () => void;
  closeLabel: string;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.wrap, { bottom }]} pointerEvents="box-none">
      {above}
      <View style={styles.pill}>
        {children}
        <Pressable
          style={styles.close}
          onPress={onClose}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
        >
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

// 바 위에 뜨는 카드·알약 공통 그림자(지도 위 오버레이 톤).
export const floatingShadow = {
  shadowColor: '#000',
  shadowOpacity: 0.12,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 4,
} as const;

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: spacing.xs,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    ...floatingShadow,
  },
  close: {
    width: 32,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { ...typography.body, color: colors.textMuted },
  hint: {
    ...typography.caption,
    color: colors.textStrong,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
});
