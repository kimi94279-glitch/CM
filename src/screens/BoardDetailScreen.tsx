import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BoardTopOverlay } from '../components/BoardTopOverlay';
import { Button } from '../components/Button';
import { CanvasObjectList } from '../components/CanvasObjectList';
import { ObjectEditBar } from '../components/CanvasToolBars';
import { HalfSheet } from '../components/HalfSheet';
import { useMapHost } from '../components/MapHostContext';
import { isMapStyleName, PRINT_CREDIT_LINES, type MapStyleName } from '../components/mapStyles';
import { MapStylePicker } from '../components/MapStylePicker';
import { PlaceActionBar, usePlaceActions } from '../components/PlaceActionBar';
import { CenterPin, PlaceDraftCard } from '../components/PlaceDraftCard';
import { SearchSheet } from '../components/SearchSheet';
import { ToolTray } from '../components/ToolTray';
import { KAKAO_SEARCH_ASSIST } from '../constants/config';
import { colors, spacing, typography } from '../constants/theme';
import { useAuth } from '../hooks/useAuthState';
import { useBoardMapSync } from '../hooks/useBoardMapSync';
import { useBoards, useMarkBoardRead, useSetBoardMapStyle } from '../hooks/useBoards';
import { useCanvasTools } from '../hooks/useCanvasTools';
import { useInks } from '../hooks/useInks';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
import { useMapStyle } from '../hooks/useMapStyle';
import { usePartnerId, usePartnerProfile } from '../hooks/usePartnerProfile';
import { usePlaceMemos } from '../hooks/usePlaceMemos';
import { usePlaceReactions } from '../hooks/usePlaceReactions';
import { useDeletePlace, useLivePlaces, usePlaceSearch, usePlaces } from '../hooks/usePlaces';
import { usePlacing } from '../hooks/usePlacing';
import { useSubmittedQuery } from '../hooks/useSubmittedQuery';
import type { RootStackParamList } from '../navigation/types';
import type { Place } from '../types/models';
import { friendlyError } from '../utils/errors';
import { kakaoPlaceIdOf } from '../utils/kakaoMap';
import { applyLivePlaces } from '../utils/livePlaces';
import { shareJpegBase64 } from '../utils/shareImage';

type Props = NativeStackScreenProps<RootStackParamList, 'BoardDetail'>;

// 태블릿 판정: 짧은 변(세로/가로 회전 무관)이 600dp 이상이면 Side Panel 레이아웃.
const TABLET_MIN = 600;
const SIDE_PANEL_WIDTH = 320;

// Surface First: 지도가 화면(Surface)이고, 모든 UI는 그 위에 Overlay 된다 — 책상에 펼친 종이 지도 위의 물건들.
// 위: 종이 꼬리표(지도 이름·사람) + 🔍 찾기 + 📮 한 장으로 접기. 아래: 필통(도구 줄) + 범례(모바일=Half Sheet, 태블릿=옆 패널).
// 지도 자체는 네비게이터 뒤 싱글톤 MapHost 가 그리고, 이 화면은 데이터·콜백만 주입한다(useBoardMapSync).
// 아래쪽(필통 · 핀 쪽지 바 · 편집 바)과 검색 · 범례 · 핀 확정은 서로 배타 — 하나를 열 때 나머지를 닫는다.
export function BoardDetailScreen({ route, navigation }: Props) {
  const { boardId, title } = route.params;
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isTablet = Math.min(width, height) >= TABLET_MIN;
  const keyboardHeight = useKeyboardHeight();
  const barBottom = insets.bottom + spacing.lg;

  // ── 데이터 ─────────────────────────────────────────────────────────────
  const placesQuery = usePlaces(boardId);
  // 로딩 중 `?? []`가 매 렌더 새 배열이 되어 지도 주입 effect가 반복되지 않도록 고정한다.
  const storedPlaces = useMemo(() => placesQuery.data ?? [], [placesQuery.data]);
  // 카카오 실시간 핀: 저장된 행(장소 ID·검색어)으로 지금 좌표·이름을 불러와 덮어 그린다(메모리에만).
  // places = 지도용(불러온 실시간 핀만), listPlaces = 목록용(전부, 못 찾은 핀은 알림 붙임).
  const livePlaces = useLivePlaces(storedPlaces);
  const { mapPlaces: places, listPlaces } = useMemo(
    () => applyLivePlaces(storedPlaces, livePlaces),
    [storedPlaces, livePlaces]
  );
  // 핀 위 반응 배지·메모 말풍선(지도 주입 + 핀 바). 저장(토글·입력)은 화면에 둔다 — usePlaceActions 주석.
  const reactionsQuery = usePlaceReactions(boardId);
  const reactions = useMemo(() => reactionsQuery.data ?? [], [reactionsQuery.data]);
  const memosQuery = usePlaceMemos(boardId);
  const memos = useMemo(() => memosQuery.data ?? [], [memosQuery.data]);
  const placeActions = usePlaceActions(boardId);
  const deletePlace = useDeletePlace(boardId);
  const deletingId = deletePlace.isPending ? (deletePlace.variables ?? null) : null;

  // 작성자 구분(나 · 지금 상대 · 그 밖)과 각자 고른 잉크. 솔로면 partnerLabel = null → 범례·작성자 표기 숨김.
  const { session, workspace } = useAuth();
  const myId = session?.user?.id ?? null;
  const partnerQuery = usePartnerProfile();
  const partnerId = usePartnerId();
  const inks = useInks();
  const partnerLabel =
    workspace?.status === 'active' ? (partnerQuery.data?.nickname ?? '상대') : null;

  // ── 화면 상태 ──────────────────────────────────────────────────────────
  // 반응 바가 열린 핀 id (null = 닫힘), 지도에서 강조된 핀 id(시트 자동 오픈 안 함, Surface First).
  const [reactionPlaceId, setReactionPlaceId] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  // 모바일 Half Sheet 표시 여부 (기본 닫힘 → 기본 화면은 지도만)
  const [sheetOpen, setSheetOpen] = useState(false);
  // 이 지도의 바탕 고르기 판
  const [stylesOpen, setStylesOpen] = useState(false);
  // 지도 위 검색(모바일, 상단 SearchBar + 하단 SearchSheet). 입력 → 400ms 뒤 제출된 검색어로 카카오 검색.
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchQuery, resetSearchQuery] = useSubmittedQuery(searchText);
  const search = usePlaceSearch(searchQuery);

  const tools = useCanvasTools(boardId, () => {
    Keyboard.dismiss();
    setReactionPlaceId(null);
  });

  // 싱글톤 지도(MapHost) 컨트롤러 — 데이터·콜백·카메라는 아래 useBoardMapSync 와 effect 에서 넣는다.
  const map = useMapHost();

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchText('');
    resetSearchQuery();
  };
  const openSearch = () => {
    setSheetOpen(false);
    setSearchOpen(true);
  };
  const openSheet = () => {
    setSearchOpen(false);
    setStylesOpen(false);
    setSheetOpen(true);
  };
  const openStyles = () => {
    closeSearch();
    setSheetOpen(false);
    setReactionPlaceId(null);
    setStylesOpen(true);
  };
  const goAdd = () => navigation.navigate('PlaceAdd', { boardId, title });

  // 핀 확정 모드(검색 결과 · 직접 찍기 · 태블릿 PlaceAdd 에서 돌아온 초안). 펜·스티커가 켜 있으면 지도가 안 움직이므로 끈다.
  const placingFlow = usePlacing(
    boardId,
    route.params.draft,
    () => {
      closeSearch();
      setSheetOpen(false);
      setReactionPlaceId(null);
      tools.stopTools();
    },
    (placeId) => map.dropPin(boardId, placeId)
  );
  const { placing } = placingFlow;

  // 알림 탭 진입(route.params.focus): 장소면 그 핀, 스티커처럼 장소가 없으면 좌표가 대상.
  // 장소 목록이 아직 없으면 대상이 null 이고, 목록이 도착하면 그때 적용된다.
  const focus = route.params.focus;
  const focusTarget = useMemo(() => {
    if (!focus) return null;
    if (focus.placeId) {
      const p = places.find((x) => x.id === focus.placeId);
      return p ? { placeId: p.id, lat: p.latitude, lng: p.longitude } : null;
    }
    if (focus.lat !== undefined && focus.lng !== undefined) {
      return { placeId: null, lat: focus.lat, lng: focus.lng };
    }
    return null;
  }, [focus, places]);
  // 그 핀의 바(반응·메모)를 연다 — 렌더 중 상태 조정(nonce 당 1회, effect 안 setState 회피).
  const [selectedFocusNonce, setSelectedFocusNonce] = useState<number | null>(null);
  if (focus && focusTarget?.placeId && selectedFocusNonce !== focus.nonce) {
    setSelectedFocusNonce(focus.nonce);
    setHighlightedId(focusTarget.placeId);
    setReactionPlaceId(focusTarget.placeId);
  }

  // ── 지도 ───────────────────────────────────────────────────────────────
  const isFocused = useIsFocused();
  // 필통이 보일 때만 든 도구가 살아 있다(검색·범례·핀 쪽지·편집·핀 확정 중엔 한 손가락이 지도를 움직이고 스티커도 안 붙는다).
  const toolsLive =
    !sheetOpen &&
    !stylesOpen &&
    !searchOpen &&
    !placing &&
    !reactionPlaceId &&
    !tools.selectedObject;

  // 이 지도의 바탕(boards.map_style, 0017) — 같이 그리는 사람에게도 같은 바탕. 고르지 않았으면 기기 기본 바탕.
  const boardsQuery = useBoards(workspace?.id);
  const boardRow = boardsQuery.data?.find((b) => b.id === boardId);
  const boardStyle = isMapStyleName(boardRow?.map_style) ? boardRow.map_style : null;
  const deviceStyle = useMapStyle();
  const setBoardStyle = useSetBoardMapStyle(workspace?.id);
  const pickStyle = (mapStyle: MapStyleName) =>
    setBoardStyle.mutate(
      { boardId, mapStyle },
      { onError: (e) => Alert.alert('바탕을 바꾸지 못했어요', friendlyError(e)) }
    );

  // 새 흔적 표시(0009): 들어올 때와 나갈 때 "봤다"고 기록 → 머무는 동안 생긴 흔적도 본 것으로 친다.
  const markRead = useMarkBoardRead();
  useEffect(() => {
    if (!isFocused) return;
    markRead(boardId);
    return () => markRead(boardId);
  }, [isFocused, boardId, markRead]);

  useBoardMapSync(map, boardId, {
    isFocused,
    data: { places, reactions, memos, objects: tools.objects },
    focusTarget,
    focusNonce: focus?.nonce ?? null,
    selectedObjectId: tools.selectedObjectId,
    drawTool: toolsLive ? tools.drawTool : null,
    mapStyle: boardStyle,
  });

  // WebView 메시지 콜백을 현재 보드로 등록. 스티커 모드·이모지 최신값 반영 위해 변경 시 재등록.
  useEffect(() => {
    map.setCallbacks(boardId, {
      onMarkerPress: (id) => {
        tools.closeForPlace();
        setHighlightedId(id);
        setReactionPlaceId(id);
      },
      onObjectPress: (id, point) => {
        // 스티커 도구로 그린 선(형광펜 등) 위를 탭 → 선 선택 대신 그 자리에 스티커
        if (toolsLive && tools.stickerMode && point) {
          tools.placeSticker(point);
          return;
        }
        setReactionPlaceId(null);
        setHighlightedId(null);
        tools.selectObject(id);
      },
      onObjectMove: tools.moveObject,
      onMapPress: (point) => {
        if (toolsLive && tools.stickerMode && point) {
          tools.placeSticker(point);
          return;
        }
        // 기본: 배경 탭 → 바·강조·선택 해제(메모 입력 중이면 키보드도 내림).
        Keyboard.dismiss();
        setReactionPlaceId(null);
        setHighlightedId(null);
        tools.selectObject(null);
      },
      onDrawEnd: tools.saveStroke,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId, tools.stickerMode, tools.stickerEmoji, toolsLive, map]);

  // 삭제 확인(Alert) 후 실행. order_index 재인덱싱은 하지 않는다.
  const confirmDelete = (place: Place) => {
    Alert.alert(`${place.name} 핀을 뺄까요?`, '이 핀에 남긴 반응과 쪽지도 같이 지워져요.', [
      { text: '취소', style: 'cancel' },
      { text: '빼기', style: 'destructive', onPress: () => deletePlace.mutate(place.id) },
    ]);
  };

  const reactionPlace = reactionPlaceId
    ? listPlaces.find((p) => p.id === reactionPlaceId)
    : undefined;
  const mobileSearching = !isTablet && searchOpen;
  // 함께 그리는 사람(꼬리표·지도 한 장 범례). 솔로면 나만.
  const people = [
    { name: '나', color: inks.me.solid },
    ...(partnerLabel !== null ? [{ name: partnerLabel, color: inks.partner.solid }] : []),
  ];

  // 지도 한 장으로 접기: 지금 보이는 지도를 9:16 한 장으로 굽고 공유 창을 연다(인스타 스토리·저장·카톡).
  // 핀 이름은 저장된 이름(사용자가 붙인 이름·공공데이터 이름)만 — 카카오 실시간 이름은 이미지에 남기지 않는다(ADR-016).
  const [exporting, setExporting] = useState(false);
  const exportOnePage = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const now = new Date();
      // 함께 그린 사람은 표제란 범례에 잉크와 같이 나오므로 날짜 줄에는 날짜만
      const data = await map.exportCard({
        title,
        dateText: `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`,
        people,
        names: Object.fromEntries(storedPlaces.map((p) => [p.id, p.name])),
        credit: PRINT_CREDIT_LINES,
      });
      if (!data) {
        Alert.alert('지도 한 장을 만들지 못했어요', '지도가 다 뜬 뒤에 다시 눌러 주세요.');
        return;
      }
      const shared = await shareJpegBase64(data, `map-${Date.now()}.jpg`);
      if (!shared) {
        Alert.alert('새 버전에서 열려요', '지도 한 장 공유는 앱을 업데이트한 뒤에 쓸 수 있어요.');
      }
    } catch (e) {
      Alert.alert('지도 한 장을 만들지 못했어요', friendlyError(e));
    } finally {
      setExporting(false);
    }
  };

  // 지도 영역(로딩/에러 + 상단 꼬리표 + 필통 + 아래쪽 바들). 투명 + box-none 으로 지도 터치를 통과시킨다.
  const mapArea = (
    <View style={styles.mapArea} pointerEvents="box-none">
      {placesQuery.isError ? (
        <View style={[StyleSheet.absoluteFill, styles.errorFill]}>
          <Text style={styles.errorText}>장소를 불러오지 못했어요.</Text>
          <Button title="다시 시도" variant="secondary" onPress={() => placesQuery.refetch()} />
        </View>
      ) : null}

      {placesQuery.isLoading ? (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null}

      {/* 모바일 검색은 지도 위에서(openSearch), 태블릿은 PlaceAdd 화면. */}
      <BoardTopOverlay
        topInset={insets.top}
        title={title}
        people={people}
        search={
          mobileSearching
            ? { text: searchText, onChangeText: setSearchText, onClose: closeSearch }
            : null
        }
        onBack={() => navigation.goBack()}
        onPressSearch={isTablet ? goAdd : openSearch}
        onPressExport={exportOnePage}
        exporting={exporting}
      />

      {/* 필통: 핀 쪽지 바·편집 바·검색·범례·핀 확정 중에는 비켜 준다 */}
      {toolsLive ? (
        <ToolTray
          bottom={insets.bottom + spacing.sm}
          ink={inks.me}
          tool={tools.tool}
          onPick={tools.pickTool}
          onPin={() => placingFlow.startDirect('')}
          stickerEmoji={tools.stickerEmoji}
          onPickEmoji={tools.setStickerEmoji}
          canUndo={tools.canUndo}
          onUndo={tools.undoDraw}
          placeCount={listPlaces.length}
          onOpenLegend={isTablet ? undefined : openSheet}
          onOpenStyles={openStyles}
          onRecenter={() => map.recenter()}
        />
      ) : null}

      {reactionPlaceId ? (
        <PlaceActionBar
          key={reactionPlaceId}
          placeId={reactionPlaceId}
          kakaoPlaceId={reactionPlace ? kakaoPlaceIdOf(reactionPlace) : null}
          reactions={reactions}
          memos={memos}
          actions={placeActions}
          myId={myId}
          partnerId={partnerId}
          inks={inks}
          keyboardHeight={keyboardHeight}
          restingBottom={barBottom}
          onClose={() => setReactionPlaceId(null)}
        />
      ) : null}

      {tools.selectedObject ? (
        <ObjectEditBar
          bottom={barBottom}
          object={tools.selectedObject}
          onResize={tools.resizeSelected}
          onDelete={tools.deleteSelected}
          onClose={() => tools.selectObject(null)}
        />
      ) : null}
    </View>
  );

  // 핀 확정 모드: 가운데 고정 핀 + 이름 확인 카드(키보드 위로). 지도 가운데 = 화면 가운데라 화면 전체에 띄운다
  // (태블릿도 — PlaceAdd 초안·📌 핀으로 들어온다).
  const placingUI = placing ? (
    <>
      <CenterPin color={inks.me.solid} />
      <PlaceDraftCard
        kind={placing.kind}
        name={placingFlow.draftName}
        onChangeName={placingFlow.setDraftName}
        saving={placingFlow.saving}
        error={placingFlow.draftError}
        onConfirm={placingFlow.confirm}
        onCancel={placingFlow.cancel}
        onSwitchOther={placingFlow.switchToOther}
        canSwitchToLive={!!placing.live}
        liveInfo={placing.kind === 'live' ? (placing.live?.info ?? null) : null}
        lift={keyboardHeight}
        bottomInset={keyboardHeight > 0 ? 0 : insets.bottom}
      />
    </>
  ) : null;

  const list = (onAdd: () => void, onClose?: () => void) => (
    <CanvasObjectList
      places={listPlaces}
      myId={myId}
      partnerId={partnerId}
      partnerLabel={partnerLabel}
      highlightedId={highlightedId}
      deletingId={deletingId}
      onAdd={onAdd}
      onDelete={confirmDelete}
      onClose={onClose}
    />
  );

  // 이 지도의 바탕 고르기 판(아래 시트). 고르면 바로 지도가 바뀌고(낙관 반영) 같이 그리는 사람에게도 저장된다.
  // 시트가 낮아 지도가 보이므로, 넘겨 보며 바로 비교할 수 있다.
  const stylesUI = stylesOpen ? (
    <HalfSheet
      height={300 + insets.bottom}
      bottomInset={0}
      onDismissed={() => setStylesOpen(false)}
      closeLabel="바탕 고르기 닫기"
    >
      {() => (
        <View style={[styles.stylesBody, { paddingBottom: insets.bottom + spacing.md }]}>
          <Text style={styles.stylesTitle} accessibilityRole="header">
            이 지도의 바탕
          </Text>
          <Text style={styles.stylesNote}>
            {partnerLabel ? `${partnerLabel}에게도 이 바탕으로 보여요.` : '이 지도에만 적용돼요.'}
          </Text>
          <MapStylePicker value={boardStyle ?? deviceStyle} onPick={pickStyle} />
        </View>
      )}
    </HalfSheet>
  ) : null;

  // 태블릿: 좌 지도 + 우 Side Panel(목록 상시)
  if (isTablet) {
    return (
      <View style={styles.surface} pointerEvents="box-none">
        <View style={styles.tabletRow} pointerEvents="box-none">
          {mapArea}
          <View style={[styles.sidePanel, { paddingTop: insets.top + spacing.sm }]}>
            {list(goAdd)}
          </View>
        </View>
        {placingUI}
        {stylesUI}
      </View>
    );
  }

  // 모바일: 지도 + (요청 시) Half Sheet / 핀 확정 카드 / 검색 결과 Sheet
  return (
    <View style={styles.surface} pointerEvents="box-none">
      {mapArea}

      {sheetOpen && !searchOpen ? (
        <HalfSheet
          height={Math.round(height * 0.5)}
          bottomInset={insets.bottom}
          onDismissed={() => setSheetOpen(false)}
          closeLabel="범례 닫기"
        >
          {(dismiss) => list(openSearch, dismiss)}
        </HalfSheet>
      ) : null}

      {stylesUI}

      {placingUI}

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
            onSelect={(result) => placingFlow.selectResult(result, searchQuery)}
            selecting={placingFlow.selecting}
            onDirectPin={() => placingFlow.startDirect(searchText.trim())}
            assistEnabled={KAKAO_SEARCH_ASSIST}
            maxHeight={Math.max(200, height - keyboardHeight - insets.top - 80)}
            bottomInset={keyboardHeight > 0 ? spacing.sm : insets.bottom}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // 투명: 네비게이터 뒤 싱글톤 MapHost가 비쳐 보이도록(BoardDetail은 오버레이 UI만 소유).
  surface: { flex: 1, backgroundColor: 'transparent' },
  mapArea: { flex: 1 },
  tabletRow: { flex: 1, flexDirection: 'row' },
  sidePanel: {
    width: SIDE_PANEL_WIDTH,
    backgroundColor: colors.surface,
    borderLeftWidth: 1,
    borderColor: colors.border,
  },

  errorFill: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.bg, // 오류 시 지도를 가린다(absoluteFill 위).
  },
  errorText: { ...typography.body, color: colors.danger, marginBottom: spacing.md },
  stylesBody: { paddingHorizontal: spacing.md, gap: spacing.xs },
  stylesTitle: { ...typography.title, fontSize: 18, lineHeight: 24, color: colors.textStrong },
  stylesNote: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.sm },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 검색 Sheet 래퍼: 화면 전체를 덮되 box-none(상단 지도 통과), 카드는 하단 정렬.
  searchSheetWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.md,
  },
});
