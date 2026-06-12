import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Keyboard,
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
import { SearchBar } from '../components/SearchBar';
import { SearchSheet } from '../components/SearchSheet';
import { REACTION_EMOJI, REACTION_ORDER } from '../constants/reactions';
import { colors, radius, spacing, typography } from '../constants/theme';
import { useAddMapObject, useMapObjects } from '../hooks/useMapObjects';
import { useAddReaction, usePlaceReactions } from '../hooks/usePlaceReactions';
import { useAddPlace, useDeletePlace, usePlaceSearch, usePlaces } from '../hooks/usePlaces';
import type { RootStackParamList } from '../navigation/types';
import type { MapObject, Place, PlaceSearchResult } from '../types/models';

type Props = NativeStackScreenProps<RootStackParamList, 'BoardDetail'>;

// 태블릿 판정: 짧은 변(세로/가로 회전 무관)이 600dp 이상이면 Side Panel 레이아웃.
const TABLET_MIN = 600;
const SIDE_PANEL_WIDTH = 320;

// P0 스티커 이모지 셋(지리 고정 객체). Text/Arrow/Draw 는 P0 범위 밖.
const STICKER_EMOJIS = ['❤️', '😂', '👀', '🤮', '☕', '🌳', '📸'];

// Surface First: 지도가 화면(Surface)이고, 모든 UI는 그 위에 Overlay 된다.
// 기본 상태는 지도만. 목록은 모바일=Floating 버튼→Half Sheet, 태블릿=Right Side Panel.
export function BoardDetailScreen({ route, navigation }: Props) {
  const { boardId } = route.params;
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isTablet = Math.min(width, height) >= TABLET_MIN;

  const placesQuery = usePlaces(boardId);
  const places = placesQuery.data ?? [];

  // 장소 반응(banter). 핀 위 이모지 배지로 표시. 재진입/앱 복귀 시 상대 반응 반영.
  const reactionsQuery = usePlaceReactions(boardId);
  const reactions = reactionsQuery.data ?? [];
  const addReaction = useAddReaction(boardId);
  // 반응 팔레트가 열린 핀 id (null = 닫힘).
  const [reactionPlaceId, setReactionPlaceId] = useState<string | null>(null);

  // Infinite Geographic Canvas P0: 지리 고정 스티커. 도구 ON 시 지도 탭으로 배치.
  const objectsQuery = useMapObjects(boardId);
  const objects = objectsQuery.data ?? [];
  const addMapObject = useAddMapObject(boardId);
  const [stickerMode, setStickerMode] = useState(false);
  const [stickerEmoji, setStickerEmoji] = useState('❤️');
  // 실기기 검증용(테스트 경로): 마지막 저장된 객체의 좌표/레벨 표시.
  const [lastSaved, setLastSaved] = useState<MapObject | null>(null);

  // 지도 명령형 핸들(Recenter 등). RN → WebView injectJavaScript 경유.
  const mapRef = useRef<MapWebViewHandle>(null);

  // 지도 마커 클릭 → 강조 ID만 설정(시트 자동 오픈 안 함, Surface First 우선).
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  // 모바일 Half Sheet 표시 여부 (기본 닫힘 → 기본 화면은 지도만)
  const [sheetOpen, setSheetOpen] = useState(false);
  const deletePlace = useDeletePlace(boardId);
  const deletingId = deletePlace.isPending ? (deletePlace.variables ?? null) : null;

  // Surface First Search(P2): 검색을 지도 위에서(상단 SearchBar + 하단 SearchSheet) 수행.
  // 목록 Sheet 와 상호 배타. searchText(입력) → 300ms 디바운스 → searchQuery(제출).
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setSearchQuery(searchText.trim()), 300);
    return () => clearTimeout(id);
  }, [searchText]);
  const search = usePlaceSearch(searchQuery);
  const addPlace = useAddPlace(boardId);

  // 키보드 높이 추적 → SearchSheet를 키보드 위로 올린다(라이브러리 없이 결정적 제어).
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) =>
      setKeyboardHeight(e.endCoordinates.height)
    );
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // 상호 배타 전환 헬퍼.
  const openSearch = () => {
    setSheetOpen(false);
    setSearchOpen(true);
  };
  const closeSearch = () => {
    setSearchOpen(false);
    setSearchText('');
    setSearchQuery('');
  };
  const openSheet = () => {
    setSearchOpen(false);
    setSheetOpen(true);
  };
  const onAddResult = (result: PlaceSearchResult) => {
    addPlace.mutate(result, { onSuccess: () => closeSearch() });
  };

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
          <MapWebView
            ref={mapRef}
            places={places}
            reactions={reactions}
            objects={objects}
            onMarkerPress={(id) => {
              setHighlightedId(id);
              setReactionPlaceId(id);
            }}
            onMapPress={(point) => {
              // 스티커 모드 + 좌표 있음 → 탭 위치에 지리 고정 스티커 생성.
              if (stickerMode && point) {
                addMapObject.mutate(
                  {
                    type: 'sticker',
                    latitude: point.lat,
                    longitude: point.lng,
                    zoomLevel: point.level,
                    payload: { emoji: stickerEmoji },
                  },
                  { onSuccess: (saved) => setLastSaved(saved) }
                );
                return;
              }
              // 기본: 배경 탭 → 팔레트/강조 해제.
              setReactionPlaceId(null);
              setHighlightedId(null);
            }}
          />
        )}
      </View>

      {placesQuery.isLoading ? (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null}

      {/* Top Overlay: 검색 활성 시 SearchBar(전체폭), 아니면 Back + (표시용) MapSearchBar.
          모바일 검색 진입은 PlaceAdd 풀스크린 대신 지도 위 검색(openSearch). 태블릿은 기존 PlaceAdd 유지. */}
      <View
        style={[styles.topOverlay, { paddingTop: insets.top + spacing.xs }]}
        pointerEvents="box-none"
      >
        {!isTablet && searchOpen ? (
          <SearchBar value={searchText} onChangeText={setSearchText} onClose={closeSearch} />
        ) : (
          <>
            <Pressable style={styles.backButton} onPress={() => navigation.goBack()} hitSlop={8}>
              <Text style={styles.backIcon}>‹</Text>
            </Pressable>
            <View style={styles.searchWrap}>
              <MapSearchBar onPress={isTablet ? goAdd : openSearch} />
            </View>
          </>
        )}
      </View>

      {/* 모바일 전용 Floating 버튼(목록). 시트가 열려 있으면 숨김.
          향후 Floating Actions 그룹(목록/추가/현재위치)으로 확장 가능한 컨테이너 구조. */}
      {!isTablet && !sheetOpen && !searchOpen ? (
        <View
          style={[styles.fabGroup, { bottom: insets.bottom + spacing.lg }]}
          pointerEvents="box-none"
        >
          {/* 스티커 도구(P0): ON 시 지도 탭으로 지리 고정 스티커 배치. */}
          <Pressable
            style={[styles.fab, stickerMode && styles.fabActive]}
            onPress={() => setStickerMode((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel="스티커 모드"
          >
            <Text style={styles.fabIcon}>✨</Text>
          </Pressable>
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
            onPress={openSheet}
            accessibilityRole="button"
            accessibilityLabel={`목록 ${places.length}개 열기`}
          >
            <Text style={styles.fabIcon}>☰</Text>
            <Text style={styles.fabCount}>{places.length}</Text>
          </Pressable>
        </View>
      ) : null}

      {/* 반응 팔레트(핀 탭 시): 하단 중앙 가로 바. (i) 좌표변환 불필요 — 어느 핀인지는 핀 강조로 표시. */}
      {reactionPlaceId ? (
        <View
          style={[styles.reactionBar, { bottom: insets.bottom + spacing.lg }]}
          pointerEvents="box-none"
        >
          <View style={styles.reactionBarInner}>
            {REACTION_ORDER.map((type) => (
              <Pressable
                key={type}
                style={styles.reactionEmojiBtn}
                onPress={() => addReaction.mutate({ placeId: reactionPlaceId, type })}
                accessibilityRole="button"
                accessibilityLabel={`반응 ${type}`}
              >
                <Text style={styles.reactionEmoji}>{REACTION_EMOJI[type]}</Text>
              </Pressable>
            ))}
            <Pressable
              style={styles.reactionClose}
              onPress={() => setReactionPlaceId(null)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="반응 닫기"
            >
              <Text style={styles.reactionCloseText}>✕</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* 스티커 도구 바(P0): 이모지 선택 + 종료 + (테스트) 마지막 저장 좌표. */}
      {stickerMode ? (
        <View
          style={[styles.stickerBar, { bottom: insets.bottom + spacing.lg }]}
          pointerEvents="box-none"
        >
          <View style={styles.stickerBarInner}>
            {STICKER_EMOJIS.map((emoji) => (
              <Pressable
                key={emoji}
                style={[
                  styles.stickerEmojiBtn,
                  stickerEmoji === emoji && styles.stickerEmojiSelected,
                ]}
                onPress={() => setStickerEmoji(emoji)}
                accessibilityRole="button"
                accessibilityLabel={`스티커 ${emoji}`}
              >
                <Text style={styles.stickerEmoji}>{emoji}</Text>
              </Pressable>
            ))}
            <Pressable
              style={styles.reactionClose}
              onPress={() => setStickerMode(false)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="스티커 모드 종료"
            >
              <Text style={styles.reactionCloseText}>✕</Text>
            </Pressable>
          </View>
          <Text style={styles.stickerHint}>지도를 탭해 {stickerEmoji} 스티커를 놓으세요</Text>
          {lastSaved ? (
            <Text style={styles.stickerDebug}>
              저장됨 · lat {lastSaved.latitude.toFixed(5)} · lng {lastSaved.longitude.toFixed(5)} ·
              lv {lastSaved.zoom_level}
            </Text>
          ) : null}
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
          컨테이너 box-none + sheetCard만 터치 수신 → 상단 지도 팬/줌/마커탭 통과.
          검색 Sheet 와 상호 배타(searchOpen 시 미표시). */}
      {sheetOpen && !searchOpen ? (
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
              onAdd={openSearch}
              onDelete={confirmDelete}
              onClose={dismiss}
            />
          </Animated.View>
        </View>
      ) : null}

      {/* 검색 결과 Sheet: keyboardHeight 만큼 위로 올림(양 플랫폼 결정적).
          box-none → 시트 미점유 상단 지도는 계속 보이고 조작 가능(Surface First). */}
      {searchOpen ? (
        <View
          style={[styles.searchSheetWrap, { paddingBottom: keyboardHeight }]}
          pointerEvents="box-none"
        >
          <SearchSheet
            query={searchQuery}
            isFetching={search.isFetching}
            isError={search.isError}
            results={search.data ?? []}
            onAdd={onAddResult}
            adding={addPlace.isPending}
            maxHeight={Math.max(200, height - keyboardHeight - insets.top - 80)}
            bottomInset={keyboardHeight > 0 ? spacing.sm : insets.bottom}
          />
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
  // 검색 Sheet 래퍼: 화면 전체를 덮되 box-none(상단 지도 통과), 카드는 하단 정렬.
  searchSheetWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'flex-end',
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

  // 반응 팔레트(핀 탭 시 하단 중앙). box-none 컨테이너 + 가운데 바만 터치 수신.
  reactionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  reactionBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  reactionEmojiBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionEmoji: { fontSize: 24 },
  reactionClose: {
    width: 32,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionCloseText: { ...typography.body, color: colors.textMuted },

  // 스티커 도구(P0) — 반응 팔레트와 구분되는 별도 바.
  fabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stickerBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: spacing.xs,
  },
  stickerBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  stickerEmojiBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.card,
  },
  stickerEmojiSelected: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  stickerEmoji: { fontSize: 22 },
  stickerHint: {
    ...typography.caption,
    color: colors.textStrong,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  stickerDebug: {
    ...typography.caption,
    color: colors.textMuted,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
});
