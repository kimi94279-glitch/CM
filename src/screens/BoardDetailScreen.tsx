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
import { MapSearchBar } from '../components/MapSearchBar';
import { MapWebView } from '../components/MapWebView';
import { PlaceCard } from '../components/PlaceCard';
import { ScreenContainer } from '../components/ScreenContainer';
import { colors, radius, spacing, typography } from '../constants/theme';
import { useDeletePlace, usePlaces } from '../hooks/usePlaces';
import type { RootStackParamList } from '../navigation/types';
import type { Place } from '../types/models';

type Props = NativeStackScreenProps<RootStackParamList, 'BoardDetail'>;

export function BoardDetailScreen({ route, navigation }: Props) {
  const { boardId, title } = route.params;
  const placesQuery = usePlaces(boardId);
  const places = placesQuery.data ?? [];

  // 지도 마커 클릭 → 강조 ID 설정(화면 전환 없음). 보조 목록 패널에서 강조로 보인다.
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  // 보조 목록 패널 펼침/접힘 (지도 중심 유지, 목록은 보조)
  const [listOpen, setListOpen] = useState(false);
  const deletePlace = useDeletePlace(boardId);

  const goAdd = () => navigation.navigate('PlaceAdd', { boardId });

  // 삭제 확인(Alert) 후 실행. order_index 재인덱싱은 하지 않는다.
  const confirmDelete = (place: Place) => {
    Alert.alert('장소 삭제', `'${place.name}'을(를) 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => deletePlace.mutate(place.id) },
    ]);
  };

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

      {/* 상단 고정 검색바 (재사용 컴포넌트, 장소 추가 진입점) */}
      <MapSearchBar onPress={goAdd} />

      {/* 지도 중심: 풀스크린 지도 */}
      <View style={styles.mapWrap}>
        {placesQuery.isError ? (
          <View style={styles.fill}>
            <Text style={styles.errorText}>장소를 불러오지 못했어요.</Text>
            <Button title="다시 시도" variant="secondary" onPress={() => placesQuery.refetch()} />
          </View>
        ) : (
          <MapWebView places={places} onMarkerPress={(id) => setHighlightedId(id)} />
        )}
        {placesQuery.isLoading ? (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : null}
      </View>

      {/* 보조 패널: 장소 목록 (펼침/접힘). 기존 추가/삭제/번호/강조 유지 */}
      <View style={styles.panel}>
        <Pressable style={styles.panelHeader} onPress={() => setListOpen((v) => !v)}>
          <Text style={styles.panelTitle}>장소 {places.length}</Text>
          <Text style={styles.panelToggle}>{listOpen ? '▼' : '▲'}</Text>
        </Pressable>

        {listOpen ? (
          places.length === 0 ? (
            <View style={styles.panelEmpty}>
              <Text style={styles.panelEmptyText}>검색으로 가고 싶은 장소를 추가해보세요.</Text>
              <Button title="장소 추가하기" variant="secondary" onPress={goAdd} />
            </View>
          ) : (
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
              style={styles.panelList}
              contentContainerStyle={styles.panelListContent}
              showsVerticalScrollIndicator={false}
            />
          )
        ) : null}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 0 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  back: { fontSize: 30, color: colors.textStrong, width: 32 },
  headerTitle: { ...typography.title, color: colors.textStrong, flex: 1 },
  headerSpacer: { width: 32 },
  mapWrap: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: radius.card,
    marginTop: spacing.sm,
  },
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { ...typography.body, color: colors.danger, marginBottom: spacing.md },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panel: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
    maxHeight: '45%',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  panelTitle: { ...typography.label, color: colors.textStrong },
  panelToggle: { ...typography.label, color: colors.textMuted },
  panelEmpty: { paddingBottom: spacing.lg, gap: spacing.md },
  panelEmptyText: { ...typography.body, color: colors.textMuted },
  panelList: { flexGrow: 0 },
  panelListContent: { paddingBottom: spacing.lg },
});
