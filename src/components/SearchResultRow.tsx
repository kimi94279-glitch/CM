import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../constants/theme';
import type { PlaceSearchResult } from '../types/models';

interface SearchResultRowProps {
  result: PlaceSearchResult;
  onAdd: () => void;
  adding?: boolean;
}

// 검색 결과 1행(장소명 + 주소 + [추가]). PlaceAddScreen UI 복붙이 아닌 경량 전용 컴포넌트.
export function SearchResultRow({ result, onAdd, adding = false }: SearchResultRowProps) {
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
        style={[styles.addBtn, adding ? styles.addBtnDisabled : null]}
        onPress={onAdd}
        disabled={adding}
        accessibilityRole="button"
        accessibilityLabel={`${result.name} 추가`}
      >
        <Text style={styles.addText}>{adding ? '추가 중' : '추가'}</Text>
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
  addBtnDisabled: { opacity: 0.5 },
  addText: { ...typography.label, color: colors.textStrong, fontWeight: '600' },
});
