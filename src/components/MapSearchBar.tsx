import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, spacing, typography } from '../constants/theme';

interface MapSearchBarProps {
  onPress: () => void;
  placeholder?: string;
}

// 재사용 가능한 상단 검색바(표시 전용).
// 현재: 탭 시 장소 검색/추가 진입. 향후: Canvas Object 생성 진입점으로 확장 예정.
export function MapSearchBar({ onPress, placeholder = '장소를 검색해보세요' }: MapSearchBarProps) {
  return (
    <Pressable style={styles.bar} onPress={onPress} accessibilityRole="search">
      <Text style={styles.icon}>🔍</Text>
      <Text style={styles.placeholder} numberOfLines={1}>
        {placeholder}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // 지도 앱 수준의 compact 검색창 (높이 40)
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.field,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    height: 40,
  },
  icon: {
    fontSize: 14,
    marginRight: spacing.xs,
  },
  placeholder: {
    ...typography.label,
    color: colors.textMuted,
    flex: 1,
  },
});
