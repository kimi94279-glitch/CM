import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BoardCard } from '../components/BoardCard';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { ScreenContainer } from '../components/ScreenContainer';
import { colors, radius, spacing, typography } from '../constants/theme';
import { useAuth } from '../hooks/useAuthState';
import { useBoardActivity, useBoards, useDeleteBoard } from '../hooks/useBoards';
import { useInks } from '../hooks/useInks';
import { isGuest } from '../services/authService';
import type { RootStackParamList } from '../navigation/types';
import type { Board } from '../types/models';

type Props = NativeStackScreenProps<RootStackParamList, 'BoardList'>;

export function BoardListScreen({ navigation }: Props) {
  const { workspace, session } = useAuth();
  const isSolo = workspace?.status === 'solo';
  const guest = isGuest(session);
  const inks = useInks();
  const boardsQuery = useBoards(workspace?.id);
  const activityQuery = useBoardActivity(workspace?.id);
  const deleteMutation = useDeleteBoard(workspace?.id);

  // 최근에 흔적이 생긴 지도가 위로 (흔적이 없으면 만든 시각)
  const activity = activityQuery.data;
  const boards = useMemo(() => {
    const list = boardsQuery.data ?? [];
    const recent = (b: Board) => activity?.[b.id]?.lastActivityAt ?? b.created_at;
    return [...list].sort((a, b) => recent(b).localeCompare(recent(a)));
  }, [boardsQuery.data, activity]);

  const confirmDelete = (board: Board) => {
    Alert.alert(
      '이 지도를 지울까요?',
      isSolo
        ? '이 지도에 꽂은 핀과 쪽지, 그린 선이 모두 지워져요.'
        : '같이 꽂은 핀과 쪽지, 그린 선이 모두 지워지고 상대 화면에서도 사라져요.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '지우기',
          style: 'destructive',
          onPress: () =>
            deleteMutation.mutate(board.id, {
              onError: () => Alert.alert('지우지 못했어요', '잠시 후 다시 시도해 주세요.'),
            }),
        },
      ]
    );
  };

  // 줄 끝 메뉴: 이름 바꾸기 / 지우기 (Android Alert 버튼 최대 3개)
  const openMenu = (board: Board) => {
    Alert.alert(board.title, undefined, [
      {
        text: '이름 바꾸기',
        onPress: () =>
          navigation.navigate('CreateBoard', { boardId: board.id, title: board.title }),
      },
      { text: '지우기', style: 'destructive', onPress: () => confirmDelete(board) },
      { text: '취소', style: 'cancel' },
    ]);
  };

  return (
    <ScreenContainer style={styles.container}>
      {/* 헤더 (초대는 솔로일 때만, 작은 단일 링크로 유지) */}
      <View style={styles.header}>
        <Text style={styles.headerTitle} accessibilityRole="header">
          {isSolo ? '내 지도' : '우리 지도'}
        </Text>
        <View style={styles.headerActions}>
          {isSolo ? (
            <Pressable
              onPress={() => navigation.navigate('InviteCreate')}
              hitSlop={8}
              accessibilityRole="button"
            >
              <Text style={styles.headerLink}>같이 그릴 사람 초대</Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => navigation.navigate('Settings')}
            hitSlop={8}
            style={styles.settings}
            accessibilityRole="button"
            accessibilityLabel="설정"
          >
            <Icon name="sliders" size={22} color={colors.textStrong} />
          </Pressable>
        </View>
      </View>

      {/* 로그인 없이 쓰는 중: 지도를 지키려면 로그인하라는 작은 안내(설정에서 로그인 → 지도 그대로) */}
      {guest ? (
        <Pressable
          onPress={() => navigation.navigate('Settings')}
          style={styles.guestBanner}
          accessibilityRole="button"
        >
          <Text style={styles.guestText}>로그인해 두면 폰을 바꿔도 지도가 남아요</Text>
          <Text style={styles.guestLink}>로그인</Text>
          <Icon name="forward" size={16} color={colors.textStrong} />
        </Pressable>
      ) : null}

      {/* 본문 */}
      {boardsQuery.isLoading ? (
        <View style={styles.fill}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : boardsQuery.isError ? (
        <View style={styles.empty}>
          <Text style={styles.errorText}>
            지도 목록을 불러오지 못했어요. 인터넷 연결을 확인하고 다시 불러와 주세요.
          </Text>
          <Button
            title="다시 불러오기"
            variant="secondary"
            onPress={() => boardsQuery.refetch()}
            style={styles.emptyCta}
          />
        </View>
      ) : boards.length === 0 ? (
        <View style={styles.empty}>
          <Icon name="fold" size={32} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>아직 펼친 지도가 없어요</Text>
          <Text style={styles.emptyDesc}>
            지도 한 장에 가고 싶은 곳을 꽂고, 가 볼 길을 연필로 그어 봐요.
          </Text>
          <Button
            title="새 지도 만들기"
            onPress={() => navigation.navigate('CreateBoard')}
            style={styles.emptyCta}
          />
        </View>
      ) : (
        <FlatList
          data={boards}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <BoardCard
              board={item}
              activity={activity?.[item.id]}
              partnerInk={inks.partner}
              onPress={() =>
                navigation.navigate('BoardDetail', { boardId: item.id, title: item.title })
              }
              onMore={() => openMenu(item)}
            />
          )}
          // 새 지도는 떠 있는 동그란 버튼 대신 서랍 맨 위 빈칸 한 줄
          ListHeaderComponent={
            <Pressable
              onPress={() => navigation.navigate('CreateBoard')}
              style={({ pressed }) => [styles.newRow, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Icon name="plus" size={20} color={colors.primary} />
              <Text style={styles.newText}>새 지도 만들기</Text>
            </Pressable>
          }
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 0,
  },
  guestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.field,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  guestText: {
    ...typography.caption,
    color: colors.textStrong,
    flexShrink: 1,
  },
  guestLink: {
    ...typography.label,
    color: colors.textStrong,
    marginLeft: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerTitle: {
    ...typography.title,
    color: colors.textStrong,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerLink: {
    ...typography.label,
    color: colors.primary,
  },
  settings: {
    padding: spacing.xs,
  },
  fill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    ...typography.body,
    color: colors.danger,
  },
  // 빈 서랍·불러오기 실패: 가운데 큰 그림 + 제목 + 회색 줄(흔한 틀) 대신 위쪽 왼쪽 정렬 한 덩어리
  empty: {
    paddingTop: spacing.xl,
  },
  emptyTitle: {
    ...typography.title,
    color: colors.textStrong,
    marginTop: spacing.md,
  },
  emptyDesc: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  emptyCta: {
    marginTop: spacing.lg,
    alignSelf: 'flex-start',
  },
  list: {
    paddingBottom: spacing.xl * 2,
  },
  newRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  newText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.primary,
  },
  pressed: {
    opacity: 0.6,
  },
});
