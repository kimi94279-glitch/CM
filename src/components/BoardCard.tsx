import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, numeric, spacing, typography, type Ink } from '../constants/theme';
import type { Board, BoardActivity } from '../types/models';
import { timeAgo } from '../utils/time';
import { Icon } from './Icon';

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

// 지도 서랍의 한 줄. 똑같은 둥근 카드를 쌓지 않고 괘선으로 나눈 차례(지도책 차례처럼).
export function BoardCard({ board, activity, partnerInk, onPress, onMore }: BoardCardProps) {
  const unread = activity?.unread ?? 0;
  const last = activity?.lastActivityAt ?? null;

  return (
    // 줄 전체가 하나의 버튼이라 iOS 화면 읽기는 안쪽 메뉴 버튼에 닿지 못한다 → 줄에 "메뉴" 동작을 달아 둔다.
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityActions={[{ name: 'menu', label: '이름 바꾸기, 지우기' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'menu') onMore();
      }}
    >
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {board.title}
        </Text>
        {unread > 0 ? (
          // 상대가 남긴 새 흔적 → 상대 잉크 색
          <View style={styles.newRow}>
            <View style={[styles.dot, partnerInk && { backgroundColor: partnerInk.solid }]} />
            <Text style={[styles.newText, partnerInk && { color: partnerInk.text }]}>
              {unread > UNREAD_CAP ? `새 흔적 ${UNREAD_CAP}개 넘게` : `새 흔적 ${unread}개`}
              {last ? `, ${timeAgo(last)}` : ''}
            </Text>
          </View>
        ) : (
          <Text style={styles.meta}>
            {last ? `마지막 흔적 ${timeAgo(last)}` : '아직 빈 지도예요'}
          </Text>
        )}
      </View>
      <Pressable
        onPress={onMore}
        hitSlop={10}
        style={({ pressed }) => [styles.more, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`${board.title} 메뉴`}
      >
        <Icon name="more" size={22} color={colors.textMuted} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 68,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm + 4,
  },
  pressed: {
    opacity: 0.6,
  },
  body: {
    flex: 1,
  },
  title: {
    ...typography.body,
    fontSize: 17,
    fontWeight: '700',
    color: colors.textStrong,
  },
  meta: {
    ...typography.caption,
    ...numeric,
    color: colors.textMuted,
    marginTop: 3,
  },
  newRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
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
    ...numeric,
    fontWeight: '600',
    color: colors.partnerText,
  },
  more: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
