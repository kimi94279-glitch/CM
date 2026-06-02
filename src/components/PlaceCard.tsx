import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../constants/theme';
import type { Place } from '../types/models';

interface PlaceCardProps {
  place: Place;
  index: number; // 표시용 순번 (1부터)
  highlighted?: boolean; // 지도에서 마커 클릭 시 강조
}

export function PlaceCard({ place, index, highlighted = false }: PlaceCardProps) {
  return (
    <View style={[styles.card, highlighted && styles.cardHighlighted]}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{index}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {place.name}
        </Text>
        <Text style={styles.address} numberOfLines={1}>
          📍 {place.latitude.toFixed(5)}, {place.longitude.toFixed(5)}
        </Text>
      </View>
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
  address: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
});
