import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { ScreenContainer } from '../components/ScreenContainer';
import { TextField } from '../components/TextField';
import { colors, spacing, typography } from '../constants/theme';
import { signUpWithEmail } from '../services/authService';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Signup'>;

function mapSignupError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.toLowerCase().includes('already registered')) {
    return '이미 가입된 이메일이에요. 로그인해주세요.';
  }
  return '가입에 실패했어요. 잠시 후 다시 시도해주세요.';
}

export function SignupScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // 이메일 인증 비활성(FLOW_AUTH.md) 전제 → 가입 즉시 세션 생성 → ProfileSetup 으로 전환
  const mutation = useMutation({
    mutationFn: () => signUpWithEmail(email.trim(), password),
  });

  const canSubmit = email.trim().length > 0 && password.length >= 6 && !mutation.isPending;

  return (
    <ScreenContainer>
      <Text style={styles.title}>회원가입</Text>

      <View style={styles.form}>
        <TextField
          label="이메일"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
        />
        <TextField
          label="비밀번호"
          value={password}
          onChangeText={setPassword}
          placeholder="6자 이상"
          secureTextEntry
        />

        {mutation.isError ? (
          <Text style={styles.error}>{mapSignupError(mutation.error)}</Text>
        ) : null}

        <Button
          title="가입하고 시작하기"
          onPress={() => mutation.mutate()}
          disabled={!canSubmit}
          loading={mutation.isPending}
          style={styles.submit}
        />
      </View>

      <Pressable onPress={() => navigation.navigate('Login')} style={styles.linkRow}>
        <Text style={styles.linkMuted}>이미 계정이 있나요? </Text>
        <Text style={styles.link}>로그인</Text>
      </Pressable>
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
  form: {
    flex: 1,
  },
  submit: {
    marginTop: spacing.sm,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
    marginBottom: spacing.sm,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.lg,
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
