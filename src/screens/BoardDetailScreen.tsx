import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button } from '../components/Button';
import { MapWebView } from '../components/MapWebView';
import { PlaceCard } from '../components/PlaceCard';
import { ScreenContainer } from '../components/ScreenContainer';
import { colors, radius, spacing, typography } from '../constants/theme';
import { useDeletePlace, usePlaces } from '../hooks/usePlaces';
import type { RootStackParamList } from '../navigation/types';
import type { Place } from '../types/models';

type Props = NativeStackScreenProps<RootStackParamList, 'BoardDetail'>;
type ViewMode = 'list' | 'map';

export function BoardDetailScreen({ route, navigation }: Props) {
  const { boardId, title } = route.params;
  const placesQuery = usePlaces(boardId);
  const places = placesQuery.data ?? [];

  const [mode, setMode] = useState<ViewMode>('list');
  // 지도에서 마커 클릭 시 설정. 화면 전환은 하지 않고, 목록 탭으로 가면 강조 상태로 보인다.
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const deletePlace = useDeletePlace(boardId);

  // 삭제 확인(Alert) 후 실행. order_index 재인덱싱은 하지 않는다.
  const confirmDelete = (place: Place) => {
    Alert.alert('장소 삭제', `'${place.name}'을(를) 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => deletePlace.mutate(place.id) },
    ]);
  };

  const renderContent = () => {
    if (placesQuery.isLoading) {
      return (
        <View style={styles.fill}>
          <ActivityIndicator color={colors.primary} />
        </View>
      );
    }
    if (placesQuery.isError) {
      return (
        <View style={styles.fill}>
          <Text style={styles.errorText}>장소를 불러오지 못했어요.</Text>
          <Button title="다시 시도" variant="secondary" onPress={() => placesQuery.refetch()} />
        </View>
      );
    }
    if (mode === 'map') {
      return (
        <View style={styles.mapWrap}>
          <MapWebView places={places} onMarkerPress={(id) => setHighlightedId(id)} />
        </View>
      );
    }
    if (places.length === 0) {
      return (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>📍</Text>
          <Text style={styles.emptyTitle}>가고 싶은 곳을 추가해보세요</Text>
          <Text style={styles.emptyDesc}>장소를 검색해 데이트 코스를 채워볼까요?</Text>
          <Button
            title="장소 추가하기"
            onPress={() => navigation.navigate('PlaceAdd', { boardId })}
            style={styles.emptyCta}
          />
        </View>
      );
    }
    return (
      <FlatList
        data={places}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <PlaceCard
            place={item}
            index={index + 1}
            highlighted={item.id === highlightedId}
            onDelete={() => confirmDelete(item)}
            deleting={deletePlace.isPending && deletePlace.variables === item.id}
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  const showFab = !placesQuery.isLoading && !placesQuery.isError && places.length > 0;

  return (
    <ScreenContainer style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* 목록 / 지도 토글 */}
      <View style={styles.tabs}>
        <Pressable
          onPress={() => setMode('list')}
          style={[styles.tab, mode === 'list' && styles.tabActive]}
        >
          <Text style={[styles.tabText, mode === 'list' && styles.tabTextActive]}>목록</Text>
        </Pressable>
        <Pressable
          onPress={() => setMode('map')}
          style={[styles.tab, mode === 'map' && styles.tabActive]}
        >
          <Text style={[styles.tabText, mode === 'map' && styles.tabTextActive]}>지도</Text>
        </Pressable>
      </View>

      {renderContent()}

      {showFab ? (
        <Pressable style={styles.fab} onPress={() => navigation.navigate('PlaceAdd', { boardId })}>
          <Text style={styles.fabText}>＋</Text>
        </Pressable>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 0 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  back: { fontSize: 30, color: colors.textStrong, width: 32 },
  headerTitle: { ...typography.title, color: colors.textStrong, flex: 1 },
  headerSpacer: { width: 32 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.border,
    borderRadius: radius.button,
    padding: 3,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.button - 2,
  },
  tabActive: { backgroundColor: colors.surface },
  tabText: { ...typography.label, color: colors.textMuted },
  tabTextActive: { color: colors.primary },
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { ...typography.body, color: colors.danger, marginBottom: spacing.md },
  mapWrap: { flex: 1, overflow: 'hidden', borderRadius: radius.card },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
  emptyEmoji: { fontSize: 44, marginBottom: spacing.md },
  emptyTitle: { ...typography.title, color: colors.textStrong, textAlign: 'center' },
  emptyDesc: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  emptyCta: { marginTop: spacing.lg, alignSelf: 'stretch' },
  list: { paddingTop: spacing.xs, paddingBottom: spacing.xl * 2 },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  fabText: { color: '#FFFFFF', fontSize: 28, lineHeight: 32 },
});
