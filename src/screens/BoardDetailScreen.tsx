import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { CanvasObjectList } from '../components/CanvasObjectList';
import { MapSearchBar } from '../components/MapSearchBar';
import { MapWebView } from '../components/MapWebView';
import { colors, radius, spacing, typography } from '../constants/theme';
import { useDeletePlace, usePlaces } from '../hooks/usePlaces';
import type { RootStackParamList } from '../navigation/types';
import type { Place } from '../types/models';

type Props = NativeStackScreenProps<RootStackParamList, 'BoardDetail'>;

// 태블릿 판정: 짧은 변(세로/가로 회전 무관)이 600dp 이상이면 Side Panel 레이아웃.
const TABLET_MIN = 600;
const SIDE_PANEL_WIDTH = 320;

// Surface First: 지도가 화면(Surface)이고, 모든 UI는 그 위에 Overlay 된다.
// 기본 상태는 지도만. 목록은 모바일=Floating 버튼→Half Sheet, 태블릿=Right Side Panel.
export function BoardDetailScreen({ route, navigation }: Props) {
  const { boardId } = route.params;
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isTablet = Math.min(width, height) >= TABLET_MIN;

  const placesQuery = usePlaces(boardId);
  const places = placesQuery.data ?? [];

  // 지도 마커 클릭 → 강조 ID만 설정(시트 자동 오픈 안 함, Surface First 우선).
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  // 모바일 Half Sheet 표시 여부 (기본 닫힘 → 기본 화면은 지도만)
  const [sheetOpen, setSheetOpen] = useState(false);
  const deletePlace = useDeletePlace(boardId);
  const deletingId = deletePlace.isPending ? (deletePlace.variables ?? null) : null;

  const goAdd = () => navigation.navigate('PlaceAdd', { boardId });

  // 삭제 확인(Alert) 후 실행. order_index 재인덱싱은 하지 않는다.
  const confirmDelete = (place: Place) => {
    Alert.alert('장소 삭제', `'${place.name}'을(를) 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => deletePlace.mutate(place.id) },
    ]);
  };

  // 지도 영역(지도 + 로딩/에러 + 상단 Overlay + 모바일 FAB)
  const mapArea = (
    <View style={styles.mapArea}>
      <View style={StyleSheet.absoluteFill}>
        {placesQuery.isError ? (
          <View style={styles.errorFill}>
            <Text style={styles.errorText}>장소를 불러오지 못했어요.</Text>
            <Button title="다시 시도" variant="secondary" onPress={() => placesQuery.refetch()} />
          </View>
        ) : (
          <MapWebView places={places} onMarkerPress={(id) => setHighlightedId(id)} />
        )}
      </View>

      {placesQuery.isLoading ? (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null}

      {/* Top Overlay: Back + Search */}
      <View
        style={[styles.topOverlay, { paddingTop: insets.top + spacing.xs }]}
        pointerEvents="box-none"
      >
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <View style={styles.searchWrap}>
          <MapSearchBar onPress={goAdd} />
        </View>
      </View>

      {/* 모바일 전용 Floating 버튼(목록). 시트가 열려 있으면 숨김.
          향후 Floating Actions 그룹(목록/추가/현재위치)으로 확장 가능한 컨테이너 구조. */}
      {!isTablet && !sheetOpen ? (
        <View style={[styles.fabGroup, { bottom: insets.bottom + spacing.lg }]} pointerEvents="box-none">
          <Pressable
            style={styles.fab}
            onPress={() => setSheetOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`목록 ${places.length}개 열기`}
          >
            <Text style={styles.fabIcon}>☰</Text>
            <Text style={styles.fabCount}>{places.length}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  // 태블릿: 좌 지도 + 우 Side Panel(목록 상시)
  if (isTablet) {
    return (
      <View style={styles.surface}>
        <View style={styles.tabletRow}>
          {mapArea}
          <View style={[styles.sidePanel, { paddingTop: insets.top + spacing.sm }]}>
            <CanvasObjectList
              places={places}
              highlightedId={highlightedId}
              deletingId={deletingId}
              onAdd={goAdd}
              onDelete={confirmDelete}
            />
          </View>
        </View>
      </View>
    );
  }

  // 모바일: 지도 + (요청 시) Half Sheet
  return (
    <View style={styles.surface}>
      {mapArea}

      {sheetOpen ? (
        <>
          <Pressable
            style={styles.backdrop}
            onPress={() => setSheetOpen(false)}
            accessibilityLabel="목록 닫기"
          />
          <View style={[styles.sheet, { paddingBottom: insets.bottom }]} pointerEvents="box-none">
            <View style={styles.sheetCard}>
              <View style={styles.grabber} />
              <CanvasObjectList
                places={places}
                highlightedId={highlightedId}
                deletingId={deletingId}
                onAdd={goAdd}
                onDelete={confirmDelete}
                onClose={() => setSheetOpen(false)}
              />
            </View>
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: { flex: 1, backgroundColor: colors.bg },
  mapArea: { flex: 1 },
  tabletRow: { flex: 1, flexDirection: 'row' },
  sidePanel: {
    width: SIDE_PANEL_WIDTH,
    backgroundColor: colors.surface,
    borderLeftWidth: 1,
    borderColor: colors.border,
  },

  errorFill: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
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

  // Top Overlay
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  backIcon: { fontSize: 28, lineHeight: 30, color: colors.textStrong },
  searchWrap: {
    flex: 1,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  // Floating Actions (현재 목록 버튼 1개, 확장 대비 그룹 컨테이너)
  fabGroup: {
    position: 'absolute',
    right: spacing.lg,
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 56,
    height: 56,
    borderRadius: 28,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primary,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  fabIcon: { fontSize: 18, color: colors.surface, marginRight: spacing.xs },
  fabCount: { ...typography.label, color: colors.surface, fontWeight: '700' },

  // Half Sheet (모바일, on-demand)
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
  },
  sheetCard: {
    height: '50%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 4,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
});
