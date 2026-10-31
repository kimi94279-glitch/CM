import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadows, spacing, typography } from '../constants/theme';
import { Icon } from './Icon';

// 지도 아래쪽 가운데에 뜨는 바(핀 반응·편집 공용 틀). box-none 컨테이너 + 가운데 판만 터치 수신.
// above = 판 위에 얹을 카드(메모 입력 등), hint = 판 아래 안내 한 줄. 끝에 닫기.
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
        <View style={styles.rule} />
        <Pressable
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}
          onPress={onClose}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
        >
          <Icon name="close" size={18} color={colors.textMuted} />
        </Pressable>
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

// 바 위에 뜨는 카드·판 공통 그림자(떠 있는 판).
export const floatingShadow = shadows.lifted;

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
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    ...floatingShadow,
  },
  rule: { width: 1, height: 24, backgroundColor: colors.border },
  close: {
    width: 36,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
  hint: {
    ...typography.caption,
    color: colors.textStrong,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.tag,
    overflow: 'hidden',
  },
});
