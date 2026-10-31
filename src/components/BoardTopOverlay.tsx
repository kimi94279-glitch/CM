import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadows, spacing, typography } from '../constants/theme';
import { Icon } from './Icon';
import { SearchBar } from './SearchBar';

const BAR_HEIGHT = 44;

// 보드 지도 위 상단. 첫 행동이 "검색"이 아니라 "지도 보기"가 되도록, 검색창 대신 지도에 붙인 종이 꼬리표(지도 이름 ·
// 함께 그리는 사람)를 두고 검색은 돋보기 버튼으로 뺐다(2026-10-31 경험 설계). 접힌 지도 버튼 = 지도 한 장으로 접기(내보내기).
// 지도 위 검색 중(모바일)이면 SearchBar(전체폭).
export function BoardTopOverlay({
  topInset,
  title,
  people,
  search,
  onBack,
  onPressSearch,
  onPressExport,
  exporting,
}: {
  topInset: number;
  title: string;
  people: { name: string; color: string }[];
  // 지도 위 검색 입력 중(모바일)이면 그 값. null = 검색 닫힘.
  search: { text: string; onChangeText: (t: string) => void; onClose: () => void } | null;
  onBack: () => void;
  onPressSearch: () => void;
  onPressExport: () => void;
  exporting: boolean;
}) {
  return (
    <View style={[styles.bar, { paddingTop: topInset + spacing.xs }]} pointerEvents="box-none">
      {search ? (
        <SearchBar
          value={search.text}
          onChangeText={search.onChangeText}
          onClose={search.onClose}
        />
      ) : (
        <>
          <Pressable
            style={({ pressed }) => [styles.round, pressed && styles.pressed]}
            onPress={onBack}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="지도 서랍으로"
          >
            <Icon name="back" size={22} />
          </Pressable>
          <View style={styles.tag}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <View style={styles.people}>
              {people.map((p) => (
                <View key={p.name} style={styles.person}>
                  <View style={[styles.dot, { backgroundColor: p.color }]} />
                  <Text style={styles.personName} numberOfLines={1}>
                    {p.name}
                  </Text>
                </View>
              ))}
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [styles.round, pressed && styles.pressed]}
            onPress={onPressSearch}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel="장소 찾기"
          >
            <Icon name="search" size={21} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.round, (exporting || pressed) && styles.pressed]}
            onPress={onPressExport}
            disabled={exporting}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel="지도 한 장으로 접기"
            accessibilityState={{ busy: exporting }}
          >
            <Icon name="fold" size={22} />
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  round: {
    width: BAR_HEIGHT,
    height: BAR_HEIGHT,
    borderRadius: radius.round,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.paper,
  },
  pressed: { opacity: 0.6 },
  // 종이 꼬리표: 지도에 붙인 종이 조각, 살짝 기울게. 지도 이름은 인쇄 지도 제목처럼 굵은 고딕.
  tag: {
    flex: 1,
    backgroundColor: colors.tag,
    borderWidth: 1,
    borderColor: colors.tagRule,
    borderRadius: radius.tag,
    paddingHorizontal: spacing.md,
    paddingTop: 4,
    paddingBottom: 5,
    transform: [{ rotate: '-0.8deg' }],
    ...shadows.paper,
  },
  title: {
    ...typography.label,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
    color: colors.tagInk,
  },
  people: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  person: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: 110 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  personName: { ...typography.caption, fontSize: 11, color: colors.textMuted, flexShrink: 1 },
});
