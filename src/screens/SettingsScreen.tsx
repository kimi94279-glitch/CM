import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery } from '@tanstack/react-query';
import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { ScreenContainer } from '../components/ScreenContainer';
import { colors, radius, spacing, typography } from '../constants/theme';
import { useAuth } from '../hooks/useAuthState';
import { usePartnerProfile } from '../hooks/usePartnerProfile';
import { deleteMyAccount, getMyProfile, signOut } from '../services/authService';
import { leaveWorkspace } from '../services/coupleService';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

// 계정·연결 설정: 같이 그리는 사람 / 연결 끊기 / 로그아웃 / 계정 삭제 (0010)
export function SettingsScreen({ navigation }: Props) {
  const { session, workspace, refresh } = useAuth();
  const profileQuery = useQuery({ queryKey: ['my-profile'], queryFn: getMyProfile });
  const partnerQuery = usePartnerProfile();

  const isActive = workspace?.status === 'active';
  const isSolo = workspace?.status === 'solo';
  const partnerName = partnerQuery.data?.nickname ?? '상대';

  // 연결 끊기 → 나는 공간 없는 상태로(게이팅이 첫 화면으로 전환), 지도는 상대에게 남는다
  const leave = useMutation({
    mutationFn: leaveWorkspace,
    onSuccess: () => refresh(),
    onError: () => Alert.alert('연결을 끊지 못했어요', '잠시 후 다시 시도해 주세요.'),
  });

  // 계정 삭제 → 세션 정리(onAuthStateChange)로 로그인 화면으로 전환
  const remove = useMutation({
    mutationFn: deleteMyAccount,
    onSuccess: () => Alert.alert('계정을 삭제했어요', '그동안 함께해 줘서 고마워요.'),
    onError: () => Alert.alert('계정을 삭제하지 못했어요', '잠시 후 다시 시도해 주세요.'),
  });

  const logout = useMutation({ mutationFn: signOut });

  const confirmLeave = () => {
    Alert.alert(
      '연결을 끊을까요?',
      `같이 그린 지도는 ${partnerName}님에게 남고, 나는 빈 상태에서 다시 시작해요. 내가 남긴 흔적은 그 지도에 그대로 남아요.`,
      [
        { text: '취소', style: 'cancel' },
        { text: '연결 끊기', style: 'destructive', onPress: () => leave.mutate() },
      ]
    );
  };

  const confirmDelete = () => {
    const what = isActive
      ? `같이 그린 지도는 ${partnerName}님에게 남아요. 내가 쓴 메모와 반응은 지워지고, 내가 찍은 장소와 그림은 이름 없이 남아요.`
      : isSolo
        ? '내 지도와 그 안의 모든 흔적이 지워져요.'
        : '계정과 내가 보낸 초대가 지워져요.';
    Alert.alert('계정을 삭제할까요?', `${what}\n\n삭제하면 되돌릴 수 없어요.`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => remove.mutate() },
    ]);
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>설정</Text>

        <Text style={styles.section}>계정</Text>
        <View style={styles.card}>
          <Row label="이름" value={profileQuery.data?.nickname ?? ''} />
          <View style={styles.divider} />
          <Row label="이메일" value={session?.user?.email ?? ''} />
        </View>

        {isActive || isSolo ? (
          <>
            <Text style={styles.section}>같이 그리기</Text>
            <View style={styles.card}>
              <Row
                label={isActive ? '같이 그리는 사람' : '혼자 그리는 중'}
                value={isActive ? partnerName : ''}
              />
            </View>
            {isActive ? (
              <Button
                title="연결 끊기"
                variant="secondary"
                onPress={confirmLeave}
                loading={leave.isPending}
                style={styles.gap}
              />
            ) : (
              <Button
                title="같이 그릴 사람 초대"
                variant="secondary"
                onPress={() => navigation.navigate('InviteCreate')}
                style={styles.gap}
              />
            )}
          </>
        ) : null}

        <Button
          title="로그아웃"
          variant="secondary"
          onPress={() => logout.mutate()}
          loading={logout.isPending}
          style={styles.logout}
        />

        <Pressable
          onPress={confirmDelete}
          disabled={remove.isPending}
          hitSlop={8}
          style={styles.deleteRow}
        >
          <Text style={styles.delete}>{remove.isPending ? '삭제하는 중…' : '계정 삭제'}</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: spacing.xl,
  },
  title: {
    ...typography.title,
    color: colors.textStrong,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  section: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.card,
    paddingHorizontal: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  rowLabel: {
    ...typography.body,
    color: colors.textStrong,
  },
  rowValue: {
    ...typography.body,
    color: colors.textMuted,
    flexShrink: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  gap: {
    marginTop: spacing.md,
  },
  logout: {
    marginTop: spacing.xl,
  },
  deleteRow: {
    alignSelf: 'center',
    marginTop: spacing.xl,
    paddingVertical: spacing.sm,
  },
  delete: {
    ...typography.label,
    color: colors.danger,
  },
});
