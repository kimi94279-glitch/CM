import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { ScreenContainer } from '../components/ScreenContainer';
import { TextField } from '../components/TextField';
import { colors, radius, spacing, typography } from '../constants/theme';
import { useAddPlace, usePlaceSearch } from '../hooks/usePlaces';
import type { RootStackParamList } from '../navigation/types';
import type { PlaceSearchResult } from '../types/models';

type Props = NativeStackScreenProps<RootStackParamList, 'PlaceAdd'>;

export function PlaceAddScreen({ route, navigation }: Props) {
  const { boardId } = route.params;
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');

  const search = usePlaceSearch(query);
  const addPlace = useAddPlace(boardId);

  const onAdd = (result: PlaceSearchResult) => {
    addPlace.mutate(result, { onSuccess: () => navigation.goBack() });
  };

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
        title="추가"
        variant="secondary"
        onPress={() => onAdd(item)}
        loading={addPlace.isPending}
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

      {addPlace.isError ? (
        <Text style={styles.error}>추가에 실패했어요. 다시 시도해주세요.</Text>
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
