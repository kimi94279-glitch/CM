import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadows, spacing, typography } from '../constants/theme';
import { Icon, type IconName } from './Icon';

// 지도 화면 "더 보기"(오른쪽 위 ⋯): 자주 안 쓰는 것들을 한 곳에. 바깥을 누르면 닫힌다.
// 화면 전체를 덮는 투명 판 위에 오른쪽 위 카드 — 안드로이드는 부모 밖 터치가 안 오므로 화면 수준에서 그린다.
export function MapMoreMenu({
  top,
  items,
  onClose,
}: {
  top: number;
  items: { icon: IconName; label: string; onPress: () => void }[];
  onClose: () => void;
}) {
  return (
    <Pressable
      style={StyleSheet.absoluteFill}
      onPress={onClose}
      accessibilityRole="button"
      accessibilityLabel="더 보기 닫기"
    >
      <View style={[styles.card, { top }]}>
        {items.map((it, i) => (
          <Pressable
            key={it.label}
            onPress={() => {
              onClose();
              it.onPress();
            }}
            style={({ pressed }) => [styles.row, i > 0 && styles.rule, pressed && styles.pressed]}
            accessibilityRole="menuitem"
          >
            <Icon name={it.icon} size={20} />
            <Text style={styles.label}>{it.label}</Text>
          </Pressable>
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    right: spacing.sm,
    minWidth: 210,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    paddingVertical: spacing.xs,
    ...shadows.lifted,
  },
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md - 4,
    paddingHorizontal: spacing.md,
  },
  rule: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  label: { ...typography.body, color: colors.textStrong },
  pressed: { backgroundColor: colors.surfaceMuted },
});
