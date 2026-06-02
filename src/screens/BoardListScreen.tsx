import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation } from '@tanstack/react-query';
import React from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { BoardCard } from '../components/BoardCard';
import { Button } from '../components/Button';
import { ScreenContainer } from '../components/ScreenContainer';
import { colors, spacing, typography } from '../constants/theme';
import { useAuth } from '../hooks/useAuthState';
import { useBoards } from '../hooks/useBoards';
import { signOut } from '../services/authService';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'BoardList'>;

export function BoardListScreen({ navigation }: Props) {
  const { workspace } = useAuth();
  const isSolo = workspace?.status === 'solo';
  const boardsQuery = useBoards(workspace?.id);
  const logout = useMutation({ mutationFn: signOut });

  const boards = boardsQuery.data ?? [];

  return (
    <ScreenContainer style={styles.container}>
      {/* 헤더 (초대는 솔로일 때만, 작은 단일 링크로 유지) */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>우리의 데이트</Text>
        <View style={styles.headerActions}>
          {isSolo ? (
            <Pressable onPress={() => navigation.navigate('InviteCreate')} hitSlop={8}>
              <Text style={styles.headerLink}>상대 초대</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={() => logout.mutate()} hitSlop={8}>
            <Text style={styles.logout}>로그아웃</Text>
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
          <Text style={styles.emptyTitle}>첫 번째 데이트 계획을 만들어보세요</Text>
          <Text style={styles.emptyDesc}>
            가고 싶은 장소를 모으고 데이트 코스를 함께 정리할 수 있어요.
          </Text>
          <Button
            title="새 데이트 보드 만들기"
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
              onPress={() =>
                navigation.navigate('BoardDetail', { boardId: item.id, title: item.title })
              }
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
  logout: {
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
    color: '#FFFFFF',
    fontSize: 28,
    lineHeight: 32,
  },
});
