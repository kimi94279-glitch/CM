import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { ScreenContainer } from '../components/ScreenContainer';
import { TextField } from '../components/TextField';
import { colors, spacing, typography } from '../constants/theme';
import { signInWithEmail } from '../services/authService';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // 로그인 성공 시 onAuthStateChange 가 게이팅 상태를 전환한다.
  const mutation = useMutation({
    mutationFn: () => signInWithEmail(email.trim(), password),
  });

  const canSubmit = email.trim().length > 0 && password.length > 0 && !mutation.isPending;

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>Couple Map</Text>
        <Text style={styles.subtitle}>둘이 함께 시작해요</Text>
      </View>

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
        placeholder="••••••••"
        secureTextEntry
      />

      {mutation.isError ? (
        <Text style={styles.error}>이메일 또는 비밀번호를 확인해주세요.</Text>
      ) : null}

      <Button
        title="로그인"
        onPress={() => mutation.mutate()}
        disabled={!canSubmit}
        loading={mutation.isPending}
        style={styles.submit}
      />

      <Pressable onPress={() => navigation.navigate('Signup')} style={styles.linkRow}>
        <Text style={styles.linkMuted}>계정이 없나요? </Text>
        <Text style={styles.link}>회원가입</Text>
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
    ...typography.display,
    color: colors.primary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
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
