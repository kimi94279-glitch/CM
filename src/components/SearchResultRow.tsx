import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../constants/theme';
import type { PlaceSearchResult } from '../types/models';

interface SearchResultRowProps {
  result: PlaceSearchResult;
  onSelect: () => void;
}

// 검색 결과 1행(장소명 + 주소 + [선택]). 고르면 지도가 그 자리로 가고 사용자가 핀을 확정한다(바로 저장하지 않음).
export function SearchResultRow({ result, onSelect }: SearchResultRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {result.name}
        </Text>
        <Text style={styles.address} numberOfLines={1}>
          {result.address}
        </Text>
      </View>
      <Pressable
        style={styles.addBtn}
        onPress={onSelect}
        accessibilityRole="button"
        accessibilityLabel={`${result.name} 선택`}
      >
        <Text style={styles.addText}>선택</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  body: { flex: 1, marginRight: spacing.sm },
  name: { ...typography.body, fontWeight: '600', color: colors.textStrong },
  address: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  addBtn: {
    height: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  addText: { ...typography.label, color: colors.textStrong, fontWeight: '600' },
});
