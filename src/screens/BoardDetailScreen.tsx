import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  PanResponder,
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
import { MapWebView, type MapWebViewHandle } from '../components/MapWebView';
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

  // 지도 명령형 핸들(Recenter 등). RN → WebView injectJavaScript 경유.
  const mapRef = useRef<MapWebViewHandle>(null);

  // 지도 마커 클릭 → 강조 ID만 설정(시트 자동 오픈 안 함, Surface First 우선).
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  // 모바일 Half Sheet 표시 여부 (기본 닫힘 → 기본 화면은 지도만)
  const [sheetOpen, setSheetOpen] = useState(false);
  const deletePlace = useDeletePlace(boardId);
  const deletingId = deletePlace.isPending ? (deletePlace.variables ?? null) : null;

  // Half Sheet 높이(고정 px). drag-down dismiss 임계값도 이 값을 공유한다.
  const cardHeight = Math.round(height * 0.5);
  // 시트 Y 오프셋(0=완전 열림, cardHeight=완전 닫힘). transform은 native driver 사용.
  // Animated.Value는 안정 인스턴스라 useState lazy-init로 보관(ref 접근 금지 규칙 회피).
  const [translateY] = useState(() => new Animated.Value(0));

  // dismiss: 아래로 슬라이드 애니메이션 완료 후에만 언마운트(setSheetOpen=false) + 다음 오픈 위해 0 리셋.
  const dismiss = () => {
    Animated.timing(translateY, {
      toValue: cardHeight,
      duration: 200,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setSheetOpen(false);
        translateY.setValue(0);
      }
    });
  };

  // grabber 전용 PanResponder. start에서 선점하지 않고(탭=일반 탭), 아래로 끄는 드래그에서만 responder 획득.
  // cardHeight가 회전 등으로 바뀌면 임계값이 함께 갱신되도록 deps에 둔다(별도 ref 불필요).
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && g.dy > Math.abs(g.dx),
        onPanResponderMove: (_, g) => translateY.setValue(Math.max(0, g.dy)),
        onPanResponderRelease: (_, g) => {
          if (g.dy > cardHeight * 0.25 || g.vy > 0.5) {
            dismiss();
          } else {
            Animated.spring(translateY, {
              toValue: 0,
              useNativeDriver: true,
              bounciness: 0,
            }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
          }).start();
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cardHeight]
  );

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
          <MapWebView ref={mapRef} places={places} onMarkerPress={(id) => setHighlightedId(id)} />
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
        <View
          style={[styles.fabGroup, { bottom: insets.bottom + spacing.lg }]}
          pointerEvents="box-none"
        >
          {/* Recenter(Utility): 전체 장소 fitBounds. 중립 스타일, 목록 위에 위치(ADR-010 빈도순). */}
          <Pressable
            style={styles.fab}
            onPress={() => mapRef.current?.recenter()}
            accessibilityRole="button"
            accessibilityLabel="전체 장소 보기"
          >
            <Text style={styles.fabIcon}>⊙</Text>
          </Pressable>
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

      {/* Half Sheet: backdrop 없음 → 시트 미점유 영역의 지도는 계속 보이고 조작 가능(Surface First).
          컨테이너 box-none + sheetCard만 터치 수신 → 상단 지도 팬/줌/마커탭 통과. */}
      {sheetOpen ? (
        <View style={[styles.sheet, { paddingBottom: insets.bottom }]} pointerEvents="box-none">
          <Animated.View
            style={[styles.sheetCard, { height: cardHeight, transform: [{ translateY }] }]}
          >
            {/* 드래그(아래로 끌어 닫기)는 외부 View가 move 시 responder 획득.
                탭(닫기)은 내부 Pressable onPress가 처리 → 탭/드래그 자연 분기. */}
            <View {...panResponder.panHandlers}>
              <Pressable
                style={styles.grabberHit}
                onPress={dismiss}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="목록 닫기"
              >
                <View style={styles.grabber} />
              </Pressable>
            </View>
            <CanvasObjectList
              places={places}
              highlightedId={highlightedId}
              deletingId={deletingId}
              onAdd={goAdd}
              onDelete={confirmDelete}
              onClose={dismiss}
            />
          </Animated.View>
        </View>
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
  // A-1+A-3: 중립색(흰 배경+보더) + 44 축소 + 약한 그림자. 코랄은 지도 핀/동선 전용으로 보존.
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    height: 44,
    borderRadius: 22,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  fabIcon: { fontSize: 16, color: colors.textStrong, marginRight: spacing.xs },
  fabCount: { ...typography.label, color: colors.textStrong, fontWeight: '700' },

  // Half Sheet (모바일, on-demand) — backdrop 없음(지도 가리지 않음)
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
  },
  sheetCard: {
    // 높이는 인라인에서 Math.round(windowHeight * 0.5)로 확정 px 주입(퍼센트-of-불확정 회피).
    overflow: 'hidden',
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
  // grabber 탭/드래그 hit area. 시각 막대(36×4)만으로는 너무 작아 드래그가 거의 인식되지 않으므로
  // 시트 상단 48px를 통째로 hit area로 확보(탭=닫기, 아래 드래그=dismiss 공용). 외부 panHandlers View가 감싼다.
  grabberHit: {
    alignSelf: 'stretch',
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
});
