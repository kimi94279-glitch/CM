import { useMutation } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Button } from '../components/Button';
import { PendingInviteNote } from '../components/PendingInviteNote';
import { ScreenContainer } from '../components/ScreenContainer';
import { TextField } from '../components/TextField';
import { colors, spacing, typography } from '../constants/theme';
import { useAuth } from '../hooks/useAuthState';
import { createProfile, signOut, suggestedNickname } from '../services/authService';

const NICKNAME_MAX = 20;

// 이름 정하기 — 이메일로 가입해 이름을 알 수 없을 때만 나온다(카카오·Apple 은 그 이름으로, 로그인 없이 시작하면 묻지 않음).
export function ProfileSetupScreen() {
  const { refresh, session } = useAuth();
  const [nickname, setNickname] = useState(() => suggestedNickname(session));

  // 프로필을 만들면 게이팅을 다시 계산 → 혼자 쓰는 공간을 만들고 지도 서랍으로
  const mutation = useMutation({
    mutationFn: () => createProfile(nickname),
    onSuccess: () => refresh(),
  });

  const trimmed = nickname.trim();
  const tooLong = trimmed.length > NICKNAME_MAX;
  const canSubmit = trimmed.length > 0 && !tooLong && !mutation.isPending;

  return (
    <ScreenContainer>
      <Text style={styles.title} accessibilityRole="header">
        이름을 알려 주세요
      </Text>
      <Text style={styles.desc}>같이 그리는 사람에게 보이는 이름이에요.</Text>
      <PendingInviteNote />

      <TextField
        value={nickname}
        onChangeText={setNickname}
        placeholder="이름"
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
        title="지도 펼치기"
        onPress={() => mutation.mutate()}
        disabled={!canSubmit}
        loading={mutation.isPending}
      />

      <Pressable
        onPress={() => signOut().catch(() => {})}
        hitSlop={8}
        style={styles.switchRow}
        accessibilityRole="button"
      >
        <Text style={styles.switchText}>다른 계정으로 로그인</Text>
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.title,
    color: colors.textStrong,
    marginTop: spacing.lg,
  },
  desc: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
    marginBottom: spacing.sm,
  },
  switchRow: {
    alignSelf: 'flex-start',
    marginTop: spacing.lg,
    paddingVertical: spacing.xs,
  },
  switchText: {
    ...typography.label,
    color: colors.textMuted,
  },
});
