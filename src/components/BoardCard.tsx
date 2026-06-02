import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, spacing, typography } from '../constants/theme';
import type { Board } from '../types/models';

interface BoardCardProps {
  board: Board;
  onPress: () => void;
}

export function BoardCard({ board, onPress }: BoardCardProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <Text style={styles.title} numberOfLines={1}>
        {board.title}
      </Text>
      <Text style={styles.meta}>탭하여 장소를 추가해보세요</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  pressed: {
    opacity: 0.85,
  },
  title: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textStrong,
  },
  meta: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
