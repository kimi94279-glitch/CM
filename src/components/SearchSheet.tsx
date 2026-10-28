import React from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../constants/theme';
import type { PlaceSearchResult } from '../types/models';
import { SearchResultRow } from './SearchResultRow';

interface SearchSheetProps {
  query: string;
  isFetching: boolean;
  isError: boolean;
  results: PlaceSearchResult[];
  onSelect: (result: PlaceSearchResult) => void;
  // 고른 결과를 공공데이터와 맞춰 보는 중(짧은 로딩)
  selecting: boolean;
  // 검색에 없거나 검색 없이: 지금 지도 가운데에 직접 핀을 꽂는다
  onDirectPin: () => void;
  // 카카오 찾기 보조가 켜져 있는지(꺼지면 직접 핀만)
  assistEnabled: boolean;
  maxHeight: number;
  bottomInset: number;
}

// 지도 위 하단 검색 결과 시트(C-1). 상태: empty / loading / error / result + 항상 "직접 핀 찍기".
// 검색 결과(카카오)는 화면 표시 전용 — 고르면 공공데이터에서 같은 가게를 찾아 핀 확정으로 간다(ADR-016 Option D′).
export function SearchSheet({
  query,
  isFetching,
  isError,
  results,
  onSelect,
  selecting,
  onDirectPin,
  assistEnabled,
  maxHeight,
  bottomInset,
}: SearchSheetProps) {
  return (
    <View style={[styles.card, { maxHeight, paddingBottom: bottomInset }]}>
      {!assistEnabled ? (
        <View style={styles.center}>
          <Text style={styles.emoji}>📍</Text>
          <Text style={styles.invite}>지도에 직접 핀을 꽂아요</Text>
          <Text style={styles.inviteSub}>아래 버튼을 누르고 지도를 움직여 자리를 맞춰 주세요.</Text>
        </View>
      ) : query.length === 0 ? (
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
            <SearchResultRow result={item} onSelect={() => onSelect(item)} disabled={selecting} />
          )}
          ListHeaderComponent={
            selecting ? (
              <View style={styles.selecting}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.attribution}>장소 정보를 확인하는 중…</Text>
              </View>
            ) : (
              <Text style={styles.attribution}>검색 제공: 카카오</Text>
            )
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />
      )}
      <Pressable
        onPress={onDirectPin}
        style={({ pressed }) => [styles.directPin, pressed && styles.pressed]}
        accessibilityRole="button"
      >
        <Text style={styles.directPinText}>📍 지도에 직접 핀 찍기</Text>
      </Pressable>
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
  attribution: {
    ...typography.caption,
    color: colors.textMuted,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  selecting: { flexDirection: 'row', alignItems: 'center', paddingLeft: spacing.md },
  directPin: {
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  directPinText: { ...typography.label, color: colors.textStrong, fontWeight: '600' },
  pressed: { opacity: 0.7 },
  noResultTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textStrong,
    textAlign: 'center',
  },
});
