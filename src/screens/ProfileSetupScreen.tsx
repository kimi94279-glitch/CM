import { useMutation } from '@tanstack/react-query';
import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Button } from '../components/Button';
import { ScreenContainer } from '../components/ScreenContainer';
import { TextField } from '../components/TextField';
import { colors, spacing, typography } from '../constants/theme';
import { useAuth } from '../hooks/useAuthState';
import { createProfile } from '../services/authService';

const NICKNAME_MAX = 20;

export function ProfileSetupScreen() {
  const { refresh } = useAuth();
  const [nickname, setNickname] = useState('');

  // 프로필 생성 후 게이팅 재계산 → no_couple(CoupleConnect) 로 전환
  const mutation = useMutation({
    mutationFn: () => createProfile(nickname),
    onSuccess: () => refresh(),
  });

  const trimmed = nickname.trim();
  const tooLong = trimmed.length > NICKNAME_MAX;
  const canSubmit = trimmed.length > 0 && !tooLong && !mutation.isPending;

  return (
    <ScreenContainer>
      <Text style={styles.title}>어떻게 불러드릴까요?</Text>

      <TextField
        label="닉네임"
        value={nickname}
        onChangeText={setNickname}
        placeholder="지민"
        autoCapitalize="words"
        autoFocus
        error={tooLong ? `${NICKNAME_MAX}자 이내로 입력해주세요.` : null}
      />

      {mutation.isError ? (
        <Text style={styles.error}>저장에 실패했어요. 다시 시도해주세요.</Text>
      ) : null}

      <Button
        title="다음"
        onPress={() => mutation.mutate()}
        disabled={!canSubmit}
        loading={mutation.isPending}
      />
      <Text style={styles.hint}>상대에게 표시되는 이름이에요</Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.title,
    color: colors.textStrong,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
    marginBottom: spacing.sm,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
