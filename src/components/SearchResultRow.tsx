import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../constants/theme';
import type { PlaceSearchResult } from '../types/models';
import { Icon } from './Icon';

interface SearchResultRowProps {
  result: PlaceSearchResult;
  onSelect: () => void;
  disabled?: boolean;
}

// 검색 결과 1행(장소명 + 주소 + [꽂기]). 고르면 공공데이터와 맞춰 본 뒤 사용자가 핀을 확정한다(바로 저장하지 않음).
// 줄 전체가 눌린다(작은 버튼만 누르게 하지 않는다).
export function SearchResultRow({ result, onSelect, disabled = false }: SearchResultRowProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        pressed && !disabled && styles.rowPressed,
        disabled && styles.disabled,
      ]}
      onPress={onSelect}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${result.name}, ${result.address}. 핀 꽂으러 가기`}
      accessibilityState={{ disabled }}
    >
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {result.name}
        </Text>
        <Text style={styles.address} numberOfLines={1}>
          {result.address}
        </Text>
      </View>
      <View style={styles.addBtn}>
        <Icon name="pin" size={16} color={colors.roadRed} />
        <Text style={styles.addText}>꽂기</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  rowPressed: { backgroundColor: colors.surfaceMuted },
  body: { flex: 1, marginRight: spacing.sm },
  name: { ...typography.body, fontWeight: '600', color: colors.textStrong },
  address: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  addBtn: {
    height: 34,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  addText: { ...typography.label, color: colors.textStrong },
  disabled: { opacity: 0.5 },
});
