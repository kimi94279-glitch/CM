import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../constants/theme';
import type { Place } from '../types/models';

interface PlaceCardProps {
  place: Place;
  index: number; // 표시용 순번 (1부터)
  highlighted?: boolean; // 지도에서 마커 클릭 시 강조
  onDelete?: () => void; // 삭제 요청 (확인은 호출 측에서)
  deleting?: boolean; // 삭제 진행 중
}

export function PlaceCard({
  place,
  index,
  highlighted = false,
  onDelete,
  deleting = false,
}: PlaceCardProps) {
  return (
    <View style={[styles.card, highlighted && styles.cardHighlighted]}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{index}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {place.name}
        </Text>
      </View>
      {onDelete ? (
        <Pressable onPress={onDelete} disabled={deleting} hitSlop={8} style={styles.delete}>
          <Text style={styles.deleteText}>{deleting ? '…' : '삭제'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  cardHighlighted: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.primarySoft,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  badgeText: {
    ...typography.label,
    color: colors.primary,
  },
  body: {
    flex: 1,
  },
  name: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textStrong,
  },
  delete: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginLeft: spacing.sm,
  },
  deleteText: {
    ...typography.label,
    color: colors.danger,
  },
});
