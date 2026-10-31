import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation } from '@tanstack/react-query';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { ScreenContainer } from '../components/ScreenContainer';
import { colors, spacing, typography } from '../constants/theme';
import { useAuth } from '../hooks/useAuthState';
import { createSoloWorkspace } from '../services/coupleService';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CoupleConnect'>;

export function CoupleConnectScreen({ navigation }: Props) {
  const { refresh } = useAuth();

  // "먼저 둘러보기" → 솔로 워크스페이스 생성 후 게이팅 재계산(→ Home)
  const soloMutation = useMutation({
    mutationFn: createSoloWorkspace,
    onSuccess: () => refresh(),
  });

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>누구랑 같이 그릴까요?</Text>
        <Text style={styles.subtitle}>
          지도 위에 같이 그릴 사람을 불러 보세요. 혼자 먼저 그려도 괜찮아요. 초대는 나중에 해도
          돼요.
        </Text>
      </View>

      <View style={styles.actions}>
        <Button
          title="같이 그릴 사람 초대하기"
          onPress={() => navigation.navigate('InviteCreate')}
        />
        <Button
          title="혼자 먼저 그려 보기"
          variant="secondary"
          onPress={() => soloMutation.mutate()}
          loading={soloMutation.isPending}
          style={styles.secondary}
        />

        {soloMutation.isError ? (
          <Text style={styles.error}>
            혼자 시작하지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요.
          </Text>
        ) : null}

        <Pressable onPress={() => navigation.navigate('InviteJoin')} style={styles.linkRow}>
          <Text style={styles.linkMuted}>초대 코드를 받았나요? </Text>
          <Text style={styles.link}>코드 입력</Text>
        </Pressable>
      </View>

      {/* 로그아웃·계정 삭제는 지도 없이도 할 수 있어야 한다 */}
      <Pressable
        onPress={() => navigation.navigate('Settings')}
        hitSlop={8}
        style={styles.settingsRow}
        accessibilityRole="button"
      >
        <Text style={styles.linkMuted}>설정</Text>
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.title,
    color: colors.textStrong,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  actions: {
    marginTop: spacing.lg,
  },
  secondary: {
    marginTop: spacing.md,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
    marginTop: spacing.sm,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  settingsRow: {
    alignSelf: 'center',
    marginTop: 'auto',
    paddingVertical: spacing.md,
  },
  linkMuted: {
    ...typography.label,
    color: colors.textMuted,
  },
  link: {
    ...typography.label,
    color: colors.primary,
  },
});
