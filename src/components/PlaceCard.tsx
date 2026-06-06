import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../constants/theme';
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
  // 리스트 row: 카드 느낌(테두리/라운드/그림자/카드 간격)을 제거하고 divider 기반으로 단순화.
  // 단, 충분한 행 높이(60dp)와 번호 배지를 유지해 flat text 목록처럼 보이지 않게 한다.
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
    backgroundColor: 'transparent',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  // highlight: 보더 강조 대신 행 배경 틴트(primarySoft).
  cardHighlighted: {
    backgroundColor: colors.primarySoft,
  },
  // 지도 번호핀과 동일한 코랄 배지(흰 숫자) → 핀-목록 연계 + highlight 틴트 위에서도 가독성 유지.
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  badgeText: {
    ...typography.label,
    fontWeight: '700',
    color: colors.surface,
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
