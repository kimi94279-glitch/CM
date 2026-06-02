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
        <Text style={styles.title}>데이트를 준비해볼까요?</Text>
        <Text style={styles.subtitle}>
          혼자 먼저 계획을 만들어도 괜찮아요.{'\n'}상대는 언제든 나중에 초대할 수 있어요.
        </Text>
      </View>

      <View style={styles.actions}>
        <Button title="💌  상대 초대하기" onPress={() => navigation.navigate('InviteCreate')} />
        <Button
          title="🧭  먼저 둘러보기"
          variant="secondary"
          onPress={() => soloMutation.mutate()}
          loading={soloMutation.isPending}
          style={styles.secondary}
        />

        {soloMutation.isError ? (
          <Text style={styles.error}>시작에 실패했어요. 잠시 후 다시 시도해주세요.</Text>
        ) : null}

        <Pressable onPress={() => navigation.navigate('InviteJoin')} style={styles.linkRow}>
          <Text style={styles.linkMuted}>초대 코드를 받았나요? </Text>
          <Text style={styles.link}>코드 입력</Text>
        </Pressable>
      </View>
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
    lineHeight: 22,
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
  linkMuted: {
    ...typography.label,
    color: colors.textMuted,
  },
  link: {
    ...typography.label,
    color: colors.primary,
  },
});
