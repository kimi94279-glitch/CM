import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../constants/theme';
import { SearchBar } from './SearchBar';

const BAR_HEIGHT = 44;

// 보드 지도 위 상단. 첫 행동이 "검색"이 아니라 "지도 보기"가 되도록, 검색창 대신 지도에 붙인 종이 꼬리표(지도 이름 ·
// 함께 그리는 사람)를 두고 검색은 🔍 도구로 뺐다(2026-10-31 경험 설계). 📮 = 지도 한 장으로 접기(내보내기).
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
            style={styles.round}
            onPress={onBack}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="지도 서랍으로"
          >
            <Text style={styles.backIcon}>‹</Text>
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
            style={styles.round}
            onPress={onPressSearch}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel="장소 찾기"
          >
            <Text style={styles.icon}>🔍</Text>
          </Pressable>
          <Pressable
            style={[styles.round, exporting && styles.busy]}
            onPress={onPressExport}
            disabled={exporting}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel="지도 한 장으로 접기"
          >
            <Text style={styles.icon}>📮</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const shadow = {
  shadowColor: '#000',
  shadowOpacity: 0.14,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 2 },
  elevation: 3,
} as const;

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
    borderRadius: BAR_HEIGHT / 2,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  busy: { opacity: 0.5 },
  backIcon: { fontSize: 28, lineHeight: 30, color: colors.textStrong },
  icon: { fontSize: 18 },
  // 종이 꼬리표: 크림색 종이, 살짝 기울게
  tag: {
    flex: 1,
    backgroundColor: '#FFFAF0',
    borderWidth: 1,
    borderColor: '#E3D6BD',
    borderRadius: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    transform: [{ rotate: '-0.8deg' }],
    ...shadow,
  },
  title: { ...typography.body, fontWeight: '800', color: '#3A2F22' },
  people: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: 1 },
  person: { flexDirection: 'row', alignItems: 'center', gap: 3, maxWidth: 110 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  personName: { ...typography.caption, fontSize: 11, color: '#8A7A62', flexShrink: 1 },
});
