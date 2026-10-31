import React from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadows, spacing, typography } from '../constants/theme';
import type { PlaceSearchResult } from '../types/models';
import { Icon, type IconName } from './Icon';
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

// 지도 위 하단 검색 결과 시트(C-1). 상태: empty / loading / error / result + 항상 "지도에 직접 꽂기".
// 빈 상태는 가운데 큰 이모지 + 제목 + 회색 줄(흔한 템플릿) 대신 왼쪽 정렬 한 덩어리: 작은 아이콘 + 할 일 한 문장.
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
        <Note icon="pin">
          찾기가 꺼져 있어요. 아래 버튼을 누르고 지도를 움직여 핀 자리를 맞춰 주세요.
        </Note>
      ) : query.length === 0 ? (
        <Note icon="search">
          가게 이름이나 동네 이름을 써 보세요. 찾은 곳은 지도에 핀으로 꽂아요.
        </Note>
      ) : isFetching ? (
        <View style={styles.note}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.noteText}>찾는 중이에요</Text>
        </View>
      ) : isError ? (
        <Note icon="close" tone="danger">
          지금은 찾기가 안 돼요. 인터넷 연결을 확인하고 다시 써 보세요.
        </Note>
      ) : results.length === 0 ? (
        <Note icon="compass">
          ‘{query}’ 이름으로는 찾지 못했어요. 이름을 줄여 쓰거나, 지도에서 그 자리를 찾아 직접 꽂아
          보세요.
        </Note>
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
                <Text style={styles.attribution}>장소 정보를 맞춰 보는 중이에요</Text>
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
        <Icon name="pin" size={18} color={colors.roadRed} />
        <Text style={styles.directPinText}>지도에 직접 꽂기</Text>
      </Pressable>
    </View>
  );
}

// 시트 안 안내 한 덩어리(왼쪽 정렬): 작은 아이콘 + 문장.
function Note({
  icon,
  tone = 'muted',
  children,
}: {
  icon: IconName;
  tone?: 'muted' | 'danger';
  children: React.ReactNode;
}) {
  const color = tone === 'danger' ? colors.danger : colors.textMuted;
  return (
    <View style={styles.note}>
      <Icon name={icon} size={20} color={color} />
      <Text style={[styles.noteText, { color }]}>{children}</Text>
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
    ...shadows.lifted,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  noteText: { ...typography.body, color: colors.textMuted, flex: 1 },
  attribution: {
    ...typography.caption,
    color: colors.textMuted,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  selecting: { flexDirection: 'row', alignItems: 'center', paddingLeft: spacing.md },
  directPin: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  directPinText: { ...typography.label, color: colors.textStrong },
  pressed: { backgroundColor: colors.surfaceMuted },
});
