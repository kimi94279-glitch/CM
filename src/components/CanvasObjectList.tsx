import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, numeric, spacing, typography } from '../constants/theme';
import { useInks } from '../hooks/useInks';
import type { Place } from '../types/models';
import { whoOf } from '../utils/who';
import { Button } from './Button';
import { Icon } from './Icon';
import { PlaceCard } from './PlaceCard';

interface CanvasObjectListProps {
  places: Place[];
  // 작성자 구분: 내 uid 와 상대 표시 이름(솔로면 null → 작성자 표기 생략).
  myId: string | null;
  // 지금 같이 그리는 사람 uid(작성자 구분: 나 · 지금 상대 · 그 밖)
  partnerId: string | null;
  partnerLabel: string | null;
  highlightedId: string | null;
  deletingId: string | null;
  onAdd: () => void;
  onDelete: (place: Place) => void;
  // 닫기 핸들러가 있으면 헤더에 닫기 버튼(모바일 Half Sheet). 태블릿 Side Panel은 미전달.
  onClose?: () => void;
}

// 범례(지도에 꽂은 장소 목록 — 종이 지도 귀퉁이의 범례처럼). 모바일 Half Sheet / 태블릿 Side Panel 공용.
// 표시 전용 컴포넌트: 데이터/뮤테이션은 상위(BoardDetailScreen)에서 주입한다.
export function CanvasObjectList({
  places,
  myId,
  partnerId,
  partnerLabel,
  highlightedId,
  deletingId,
  onAdd,
  onDelete,
  onClose,
}: CanvasObjectListProps) {
  const inks = useInks();
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          범례
        </Text>
        <Text style={styles.count}>{places.length}곳</Text>
        {onClose ? (
          <Pressable
            onPress={onClose}
            hitSlop={8}
            style={({ pressed }) => [styles.close, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="범례 닫기"
          >
            <Icon name="close" size={20} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {places.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            아직 꽂은 핀이 없어요. 가고 싶은 곳을 찾아서 꽂거나, 필통의 핀으로 지도 가운데에 바로
            꽂아요.
          </Text>
          <Button title="장소 찾기" variant="secondary" onPress={onAdd} />
        </View>
      ) : (
        <FlatList
          data={places}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const who = whoOf(item.created_by, myId, partnerId);
            return (
              <PlaceCard
                place={item}
                ink={inks[who]}
                authorLabel={
                  partnerLabel === null
                    ? null
                    : who === 'me'
                      ? '나'
                      : who === 'partner'
                        ? partnerLabel
                        : '떠난 사람'
                }
                highlighted={item.id === highlightedId}
                onDelete={() => onDelete(item)}
                deleting={deletingId === item.id}
              />
            );
          }}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // 컨테이너는 수평 패딩을 두지 않는다 → row divider/highlight 틴트가 목록 폭 전체에 닿게(풀블리드).
  container: { flex: 1 },
  // 범례 머리: 굵은 제목 + 곳 수, 아래 먹 괘선 한 줄(인쇄 지도 범례 상자처럼)
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    marginHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.textStrong,
  },
  title: {
    ...typography.title,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    color: colors.textStrong,
  },
  count: { ...typography.caption, ...numeric, color: colors.textMuted, flex: 1 },
  close: { alignSelf: 'center', padding: spacing.xs },
  pressed: { opacity: 0.6 },
  empty: {
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  emptyText: { ...typography.body, color: colors.textMuted },
  list: { flex: 1 },
  listContent: { paddingBottom: spacing.lg },
});
