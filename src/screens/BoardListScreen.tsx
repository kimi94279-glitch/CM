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
import { ScreenContainer } from '../components/ScreenContainer';
import { colors, spacing, typography } from '../constants/theme';
import { useAuth } from '../hooks/useAuthState';
import { useBoardActivity, useBoards, useDeleteBoard } from '../hooks/useBoards';
import type { RootStackParamList } from '../navigation/types';
import type { Board } from '../types/models';

type Props = NativeStackScreenProps<RootStackParamList, 'BoardList'>;

export function BoardListScreen({ navigation }: Props) {
  const { workspace } = useAuth();
  const isSolo = workspace?.status === 'solo';
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
        ? '이 지도에 남긴 장소·메모·그림이 모두 지워져요.'
        : '같이 남긴 장소·메모·그림이 모두 지워지고, 상대 화면에서도 사라져요.',
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

  // ⋯ 메뉴: 이름 바꾸기 / 지우기 (Android Alert 버튼 최대 3개)
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
        <Text style={styles.headerTitle}>{isSolo ? '내 지도' : '우리 지도'}</Text>
        <View style={styles.headerActions}>
          {isSolo ? (
            <Pressable onPress={() => navigation.navigate('InviteCreate')} hitSlop={8}>
              <Text style={styles.headerLink}>같이 그릴 사람 초대</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={() => navigation.navigate('Settings')} hitSlop={8}>
            <Text style={styles.settings}>설정</Text>
          </Pressable>
        </View>
      </View>

      {/* 본문 */}
      {boardsQuery.isLoading ? (
        <View style={styles.fill}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : boardsQuery.isError ? (
        <View style={styles.fill}>
          <Text style={styles.errorText}>목록을 불러오지 못했어요.</Text>
          <Button title="다시 시도" variant="secondary" onPress={() => boardsQuery.refetch()} />
        </View>
      ) : boards.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🗺️</Text>
          <Text style={styles.emptyTitle}>첫 지도를 만들어 볼까요?</Text>
          <Text style={styles.emptyDesc}>
            가고 싶은 곳을 찍고, 지도 위에 같이 그리고, 서로의 흔적에 반응해요.
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
              onPress={() =>
                navigation.navigate('BoardDetail', { boardId: item.id, title: item.title })
              }
              onMore={() => openMenu(item)}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* 새 보드 FAB (목록이 있을 때만) */}
      {boards.length > 0 ? (
        <Pressable style={styles.fab} onPress={() => navigation.navigate('CreateBoard')}>
          <Text style={styles.fabText}>＋</Text>
        </Pressable>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 0,
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
    ...typography.label,
    color: colors.textMuted,
  },
  fill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    ...typography.body,
    color: colors.danger,
    marginBottom: spacing.md,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  emptyEmoji: {
    fontSize: 44,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.title,
    color: colors.textStrong,
    textAlign: 'center',
  },
  emptyDesc: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  emptyCta: {
    marginTop: spacing.lg,
    alignSelf: 'stretch',
  },
  list: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl * 2,
  },
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
  fabText: {
    color: colors.onPrimary,
    fontSize: 28,
    lineHeight: 32,
  },
});
