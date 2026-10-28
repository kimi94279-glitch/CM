import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { ScreenContainer } from '../components/ScreenContainer';
import { TextField } from '../components/TextField';
import { colors, radius, spacing, typography } from '../constants/theme';
import { KAKAO_SEARCH_ASSIST } from '../constants/config';
import { useMatchPlace, usePlaceSearch } from '../hooks/usePlaces';
import type { RootStackParamList } from '../navigation/types';
import type { PlaceSearchResult } from '../types/models';
import { directDraft, draftFromMatch, type PlacingDraft } from '../utils/placeDraft';

type Props = NativeStackScreenProps<RootStackParamList, 'PlaceAdd'>;

// 지도로 넘기는 핀 초안 번호(보드 화면이 같은 초안을 두 번 열지 않게) — 화면을 다시 열어도 이어서 증가
let draftSeq = 0;

export function PlaceAddScreen({ route, navigation }: Props) {
  const { boardId, title } = route.params;
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');

  const search = usePlaceSearch(query);
  const matchPlace = useMatchPlace();

  // 결과는 저장하지 않는다 — 공공데이터와 맞춰 본 뒤 지도로 돌아가 사용자가 핀을 확정한다(ADR-016 Option D′).
  const backToMap = (draft: PlacingDraft) =>
    navigation.popTo('BoardDetail', { boardId, title, draft: { ...draft, nonce: ++draftSeq } });

  const onSelect = (result: PlaceSearchResult) => {
    if (matchPlace.isPending) return;
    matchPlace.mutate(result, {
      onSuccess: (res) => backToMap(draftFromMatch(result, res)),
      onError: () => backToMap(draftFromMatch(result, null)),
    });
  };

  const onDirectPin = () => backToMap(directDraft(query));

  const renderItem = ({ item }: { item: PlaceSearchResult }) => (
    <View style={styles.resultRow}>
      <View style={styles.resultBody}>
        <Text style={styles.resultName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.resultAddress} numberOfLines={1}>
          {item.address}
        </Text>
      </View>
      <Button
        title="선택"
        variant="secondary"
        onPress={() => onSelect(item)}
        disabled={matchPlace.isPending}
        style={styles.addButton}
      />
    </View>
  );

  return (
    <ScreenContainer>
      <Text style={styles.title}>장소 추가</Text>

      <View style={styles.searchRow}>
        <View style={styles.searchField}>
          <TextField
            value={text}
            onChangeText={setText}
            placeholder="장소를 검색해보세요"
            autoFocus
          />
        </View>
        <Button title="검색" onPress={() => setQuery(text.trim())} style={styles.searchButton} />
      </View>

      <Button
        title="📍 지도에 직접 핀 찍기"
        variant="secondary"
        onPress={onDirectPin}
        style={styles.directPin}
      />
      {KAKAO_SEARCH_ASSIST && (search.data?.length ?? 0) > 0 ? (
        <Text style={styles.muted}>
          {matchPlace.isPending ? '장소 정보를 확인하는 중…' : '검색 제공: 카카오'}
        </Text>
      ) : null}

      {search.isFetching ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : search.isError ? (
        <View style={styles.center}>
          <Text style={styles.error}>검색에 문제가 생겼어요. 잠시 후 다시 시도해주세요.</Text>
        </View>
      ) : query.length > 0 && (search.data?.length ?? 0) === 0 ? (
        <View style={styles.center}>
          <Text style={styles.muted}>검색 결과가 없어요. 다른 키워드로 찾아보세요.</Text>
        </View>
      ) : (
        <FlatList
          data={search.data ?? []}
          keyExtractor={(item, i) => `${item.providerPlaceId ?? item.name}-${i}`}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  directPin: {
    marginBottom: spacing.md,
  },
  title: {
    ...typography.title,
    color: colors.textStrong,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  searchField: {
    flex: 1,
  },
  searchButton: {
    paddingHorizontal: spacing.lg,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  resultBody: {
    flex: 1,
    marginRight: spacing.sm,
  },
  resultName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textStrong,
  },
  resultAddress: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  addButton: {
    height: 40,
    paddingHorizontal: spacing.md,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
    marginBottom: spacing.sm,
  },
  muted: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
