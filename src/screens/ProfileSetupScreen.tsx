import { useMutation } from '@tanstack/react-query';
import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Button } from '../components/Button';
import { PendingInviteNote } from '../components/PendingInviteNote';
import { ScreenContainer } from '../components/ScreenContainer';
import { TextField } from '../components/TextField';
import { colors, spacing, typography } from '../constants/theme';
import { useAuth } from '../hooks/useAuthState';
import { createProfile, suggestedNickname } from '../services/authService';

const NICKNAME_MAX = 20;

export function ProfileSetupScreen() {
  const { refresh, session } = useAuth();
  const [nickname, setNickname] = useState(() => suggestedNickname(session));
  // 소셜 로그인 이름(카카오 닉네임·Apple 이름)이 늦게 도착하면, 아직 직접 입력하지 않았을 때만 채운다.
  const suggestion = suggestedNickname(session);
  const [seenSuggestion, setSeenSuggestion] = useState(suggestion);
  if (suggestion !== seenSuggestion) {
    setSeenSuggestion(suggestion);
    if (!nickname) setNickname(suggestion);
  }

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
      <PendingInviteNote />

      <TextField
        label="닉네임"
        value={nickname}
        onChangeText={setNickname}
        placeholder="지민"
        autoCapitalize="words"
        autoFocus
        error={tooLong ? `${NICKNAME_MAX}자까지 쓸 수 있어요.` : null}
      />

      {mutation.isError ? (
        <Text style={styles.error}>
          이름을 저장하지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요.
        </Text>
      ) : null}

      <Button
        title="다음"
        onPress={() => mutation.mutate()}
        disabled={!canSubmit}
        loading={mutation.isPending}
      />
      <Text style={styles.hint}>같이 그리는 사람에게 보이는 이름이에요</Text>
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
