import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation } from '@tanstack/react-query';
import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Button } from '../components/Button';
import { ScreenContainer } from '../components/ScreenContainer';
import { TextField } from '../components/TextField';
import { colors, spacing, typography } from '../constants/theme';
import { useAuth } from '../hooks/useAuthState';
import { acceptInvite, mapAcceptInviteError } from '../services/coupleService';
import type { RootStackParamList } from '../navigation/types';
import { formatInviteCode, normalizeInviteCode } from '../utils/invite';

type Props = NativeStackScreenProps<RootStackParamList, 'InviteJoin'>;

export function InviteJoinScreen({ route }: Props) {
  const { refresh } = useAuth();
  // 딥링크(couplemap://invite?token=...)로 진입 시 코드 프리필
  const initialToken = route.params?.token ? formatInviteCode(route.params.token) : '';
  const [code, setCode] = useState(initialToken);

  // 수락 성공 시 active 커플 생성 → 게이팅이 Home 으로 전환
  const mutation = useMutation({
    mutationFn: () => acceptInvite(normalizeInviteCode(code)),
    onSuccess: () => refresh(),
  });

  const canSubmit = normalizeInviteCode(code).length > 0 && !mutation.isPending;

  return (
    <ScreenContainer>
      <Text style={styles.title}>초대 코드 입력</Text>

      <TextField
        value={code}
        onChangeText={setCode}
        placeholder="초대 코드를 입력하세요"
        autoCapitalize="characters"
        autoFocus
      />

      {mutation.isError ? (
        <Text style={styles.error}>{mapAcceptInviteError(mutation.error)}</Text>
      ) : null}

      <Button
        title="연결하기"
        onPress={() => mutation.mutate()}
        disabled={!canSubmit}
        loading={mutation.isPending}
      />
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
});
