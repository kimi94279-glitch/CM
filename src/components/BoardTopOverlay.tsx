import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../constants/theme';
import { MapSearchBar } from './MapSearchBar';
import { SearchBar } from './SearchBar';

const BAR_HEIGHT = 44;

// 보드 지도 위 상단: 검색 중이면 SearchBar(전체폭), 아니면 뒤로 + (표시용) MapSearchBar.
// 그 아래 작성자 범례(커플일 때만): 핀·반응·스티커 색 = 각자의 잉크.
export function BoardTopOverlay({
  topInset,
  search,
  onBack,
  onPressSearch,
  legend,
}: {
  topInset: number;
  // 지도 위 검색 입력 중(모바일)이면 그 값. null = 검색 닫힘.
  search: { text: string; onChangeText: (t: string) => void; onClose: () => void } | null;
  onBack: () => void;
  onPressSearch: () => void;
  legend: { meColor: string; partnerColor: string; partnerLabel: string } | null;
}) {
  const top = topInset + spacing.xs;
  return (
    <>
      <View style={[styles.bar, { paddingTop: top }]} pointerEvents="box-none">
        {search ? (
          <SearchBar
            value={search.text}
            onChangeText={search.onChangeText}
            onClose={search.onClose}
          />
        ) : (
          <>
            <Pressable style={styles.backButton} onPress={onBack} hitSlop={8}>
              <Text style={styles.backIcon}>‹</Text>
            </Pressable>
            <View style={styles.searchWrap}>
              <MapSearchBar onPress={onPressSearch} />
            </View>
          </>
        )}
      </View>

      {legend && !search ? (
        <View style={[styles.legend, { top: top + BAR_HEIGHT + spacing.xs }]} pointerEvents="none">
          <View style={[styles.legendDot, { backgroundColor: legend.meColor }]} />
          <Text style={styles.legendText}>나</Text>
          <View
            style={[styles.legendDot, styles.legendGap, { backgroundColor: legend.partnerColor }]}
          />
          <Text style={styles.legendText} numberOfLines={1}>
            {legend.partnerLabel}
          </Text>
        </View>
      ) : null}
    </>
  );
}

const shadow = {
  shadowColor: '#000',
  shadowOpacity: 0.12,
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
  backButton: {
    width: BAR_HEIGHT,
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  backIcon: { fontSize: 28, lineHeight: 30, color: colors.textStrong },
  searchWrap: { flex: 1, ...shadow },

  // 작성자 범례(상단 바 아래 좌측 작은 칩).
  legend: {
    position: 'absolute',
    left: spacing.md,
    maxWidth: 220,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    ...shadow,
    shadowRadius: 4,
  },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: spacing.xs },
  legendGap: { marginLeft: spacing.sm },
  legendText: { ...typography.caption, color: colors.textStrong, flexShrink: 1 },
});
