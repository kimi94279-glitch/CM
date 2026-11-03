import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, numeric, radius, spacing, typography } from '../constants/theme';
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
  // 닫기 핸들러가 있으면 헤더에 닫기 버튼. 맨 위에 찾기 줄이 있으면(onSearch) 시트 손잡이로 닫으므로 생략.
  onClose?: () => void;
  // 맨 위 찾기 줄(엄지 닿는 곳): 누르면 찾기 입력, 옆 빨간 핀 = 핀 도구 들기(2026-11-03 섞은 시안)
  onSearch?: () => void;
  onPin?: () => void;
}

// 꽂은 곳(예전 이름 범례 — 지도에 꽂은 장소 목록). 모바일은 필통 위 "꽂은 곳" 쪽지로 여는 아래 시트(지도 앱처럼 맨 위가 찾기),
// 태블릿·가로는 옆 패널. 공용.
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
  onSearch,
  onPin,
}: CanvasObjectListProps) {
  const inks = useInks();
  return (
    <View style={styles.container}>
      {onSearch ? (
        <View style={styles.searchRow}>
          <Pressable
            onPress={onSearch}
            style={({ pressed }) => [styles.searchField, pressed && styles.pressed]}
            accessibilityRole="search"
            accessibilityLabel="가게·장소 찾기"
          >
            <Icon name="search" size={20} color={colors.textMuted} />
            <Text style={styles.searchText}>가게·장소 찾기</Text>
          </Pressable>
          {onPin ? (
            <Pressable
              onPress={onPin}
              style={({ pressed }) => [styles.pinBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="핀 들기: 가게 근처를 누르면 꽂혀요"
            >
              <Icon name="pin" size={22} color={colors.onPrimary} />
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          꽂은 곳
        </Text>
        <Text style={styles.count}>{places.length}곳</Text>
        {onClose && !onSearch ? (
          <Pressable
            onPress={onClose}
            hitSlop={8}
            style={({ pressed }) => [styles.close, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="꽂은 곳 닫기"
          >
            <Icon name="close" size={20} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {places.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            아직 꽂은 핀이 없어요. 가고 싶은 곳을 찾아서 꽂거나, 필통의 핀을 들고 가게 근처를 누르면
            가장 가까운 가게에 꽂혀요.
          </Text>
          {/* 맨 위에 찾기 줄이 있으면 같은 일을 하는 단추를 또 두지 않는다 */}
          {onSearch ? null : <Button title="장소 찾기" variant="secondary" onPress={onAdd} />}
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
  // 맨 위 찾기 줄: 회색 입력칸 모양(누르면 찾기) + 빨간 핀
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  searchField: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md - 4,
    borderRadius: radius.field,
    backgroundColor: colors.surfaceMuted,
  },
  searchText: { ...typography.body, color: colors.textMuted },
  pinBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.roadRed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 머리: 굵은 제목 + 곳 수, 아래 먹 괘선 한 줄(인쇄 지도 범례 상자처럼)
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
