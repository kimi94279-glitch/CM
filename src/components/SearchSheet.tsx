import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../constants/theme';
import type { PlaceSearchResult } from '../types/models';
import { SearchResultRow } from './SearchResultRow';

interface SearchSheetProps {
  query: string;
  isFetching: boolean;
  isError: boolean;
  results: PlaceSearchResult[];
  onAdd: (result: PlaceSearchResult) => void;
  adding: boolean;
  maxHeight: number;
  bottomInset: number;
}

// 지도 위 하단 검색 결과 시트(C-1). 상태: empty / loading / error / result.
// Half Sheet 시각 패턴(상단 라운드 + 그림자)을 따르되 목록 시트와 별개의 검색 전용 콘텐츠.
export function SearchSheet({
  query,
  isFetching,
  isError,
  results,
  onAdd,
  adding,
  maxHeight,
  bottomInset,
}: SearchSheetProps) {
  return (
    <View style={[styles.card, { maxHeight, paddingBottom: bottomInset }]}>
      {query.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emoji}>🔍</Text>
          <Text style={styles.invite}>어디 가고 싶어?</Text>
          <Text style={styles.inviteSub}>카페·맛집·가보고 싶은 곳을 검색해보세요.</Text>
        </View>
      ) : isFetching ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.inviteSub}>검색 중…</Text>
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.emoji}>⚠️</Text>
          <Text style={styles.error}>검색에 문제가 생겼어요.</Text>
          <Text style={styles.inviteSub}>잠시 후 다시 시도해주세요.</Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emoji}>🗺️</Text>
          <Text style={styles.noResultTitle} numberOfLines={2}>
            ‘{query}’ 검색 결과가 없어요
          </Text>
          <Text style={styles.inviteSub}>이름을 바꾸거나 더 간단히 검색해볼까요?</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item, i) => `${item.providerPlaceId ?? item.name}-${i}`}
          renderItem={({ item }) => (
            <SearchResultRow result={item} onAdd={() => onAdd(item)} adding={adding} />
          )}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingTop: spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 4,
  },
  center: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  emoji: { fontSize: 28, marginBottom: spacing.xs },
  invite: { ...typography.title, color: colors.textStrong },
  inviteSub: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  error: { ...typography.body, color: colors.danger, textAlign: 'center' },
  noResultTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textStrong,
    textAlign: 'center',
  },
});
