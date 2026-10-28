import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography, type Ink } from '../constants/theme';
import type { Board, BoardActivity } from '../types/models';
import { timeAgo } from '../utils/time';

interface BoardCardProps {
  board: Board;
  // 새 흔적(0009). 없으면(조회 실패 등) 기본 안내만 보여준다.
  activity?: BoardActivity;
  // 새 흔적 점·글자 색 = 지금 상대 잉크
  partnerInk?: Ink;
  onPress: () => void;
  onMore: () => void;
}

const UNREAD_CAP = 99;

export function BoardCard({ board, activity, partnerInk, onPress, onMore }: BoardCardProps) {
  const unread = activity?.unread ?? 0;
  const last = activity?.lastActivityAt ?? null;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {board.title}
        </Text>
        {unread > 0 ? (
          // 상대가 남긴 새 흔적 → 상대 잉크 색
          <View style={styles.newRow}>
            <View style={[styles.dot, partnerInk && { backgroundColor: partnerInk.solid }]} />
            <Text style={[styles.newText, partnerInk && { color: partnerInk.text }]}>
              새 흔적 {unread > UNREAD_CAP ? `${UNREAD_CAP}+` : unread}
              {last ? ` · ${timeAgo(last)}` : ''}
            </Text>
          </View>
        ) : (
          <Text style={styles.meta}>
            {last ? `마지막 흔적 · ${timeAgo(last)}` : '눌러서 첫 흔적을 남겨 보세요'}
          </Text>
        )}
      </View>
      <Pressable onPress={onMore} hitSlop={10} style={styles.more} accessibilityLabel="지도 메뉴">
        <Text style={styles.moreText}>⋯</Text>
      </Pressable>
    </Pressable>
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
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    marginBottom: spacing.md,
  },
  pressed: {
    opacity: 0.85,
  },
  body: {
    flex: 1,
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
  newRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.partner,
    marginRight: 6,
  },
  newText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.partnerText,
  },
  more: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  moreText: {
    fontSize: 20,
    lineHeight: 22,
    color: colors.textMuted,
  },
});
