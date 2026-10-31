import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, inkOther, spacing, typography, type Ink } from '../constants/theme';
import type { Place } from '../types/models';
import { Icon } from './Icon';

interface PlaceCardProps {
  place: Place;
  ink?: Ink; // 장소를 추가한 사람의 잉크(나 · 지금 상대 · 그 밖=흑연)
  authorLabel?: string | null; // 작성자 표기('나' / 상대 이름). null 이면 생략(솔로)
  highlighted?: boolean; // 지도에서 마커 클릭 시 강조
  onDelete?: () => void; // 삭제 요청 (확인은 호출 측에서)
  deleting?: boolean; // 삭제 진행 중
}

// 범례 한 줄: 압정 머리(꽂은 사람 잉크) + 장소 이름 + 꽂은 사람. 지도 핀이 번호 없는 압정이라 목록도 순번을 쓰지 않는다.
export function PlaceCard({
  place,
  ink = inkOther,
  authorLabel = null,
  highlighted = false,
  onDelete,
  deleting = false,
}: PlaceCardProps) {
  return (
    <View style={[styles.card, highlighted && styles.cardHighlighted]}>
      <View style={[styles.tack, { backgroundColor: ink.solid }]}>
        <View style={styles.tackShine} />
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {place.name}
        </Text>
        {authorLabel ? (
          <Text style={[styles.author, { color: ink.text }]} numberOfLines={1}>
            {authorLabel}
          </Text>
        ) : null}
      </View>
      {onDelete ? (
        <Pressable
          onPress={onDelete}
          disabled={deleting}
          hitSlop={8}
          style={({ pressed }) => [styles.delete, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`${place.name} 지우기`}
          accessibilityState={{ busy: deleting }}
        >
          {deleting ? (
            <ActivityIndicator size="small" color={colors.textMuted} />
          ) : (
            <Icon name="trash" size={20} color={colors.textMuted} />
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

const TACK = 16;

const styles = StyleSheet.create({
  // 범례 줄: 카드 대신 괘선으로 나눈 줄(종이 지도 범례처럼).
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  // 지도에서 고른 핀: 형광펜 한 줄 그은 듯한 노랑 바탕
  cardHighlighted: {
    backgroundColor: '#FFF3C2',
  },
  // 압정 머리(지도 압정과 같은 모양을 작게)
  tack: {
    width: TACK,
    height: TACK,
    borderRadius: TACK / 2,
    marginRight: spacing.md,
    marginLeft: 2,
  },
  tackShine: {
    position: 'absolute',
    top: 3,
    left: 3.5,
    width: 5,
    height: 4,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  body: {
    flex: 1,
  },
  name: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textStrong,
  },
  author: {
    ...typography.caption,
    fontWeight: '600',
    marginTop: 1,
  },
  delete: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  pressed: { opacity: 0.6 },
});
