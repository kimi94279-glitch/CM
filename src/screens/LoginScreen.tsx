import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { PendingInviteNote } from '../components/PendingInviteNote';
import { ScreenContainer } from '../components/ScreenContainer';
import { SocialButtons } from '../components/SocialButtons';
import { TextField } from '../components/TextField';
import { colors, spacing, typography } from '../constants/theme';
import { mapSocialSignInError, signInWithEmail, startAsGuest } from '../services/authService';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

// 첫 화면: 로그인 없이 바로 시작(기본 기능 전부) · 계정이 있으면 카카오/Apple/이메일.
// 같이 그리기(초대)는 그때 로그인한다(LoginRequired). 성공 시 onAuthStateChange 가 게이팅을 전환한다.
export function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showEmail, setShowEmail] = useState(false);

  const guest = useMutation({ mutationFn: startAsGuest });

  const mutation = useMutation({
    mutationFn: () => signInWithEmail(email.trim(), password),
  });

  const canSubmit =
    email.trim().length > 0 && password.length > 0 && !mutation.isPending && !guest.isPending;

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* 영문 로고 대신(앱 이름은 아직 정하지 않았다) 이 앱이 무엇인지 한 줄 */}
        <View style={styles.header}>
          <Icon name="fold" size={32} color={colors.textStrong} />
          <Text style={styles.title}>지도 위에 같이 그려요</Text>
          <Text style={styles.subtitle}>갈 곳을 꽂고, 가 볼 길을 그어 보는 종이 지도예요.</Text>
        </View>

        <PendingInviteNote />

        <Button title="바로 시작하기" onPress={() => guest.mutate()} loading={guest.isPending} />
        <Text style={styles.hint}>
          로그인 없이 바로 그릴 수 있어요. 같이 그릴 때만 로그인하면 돼요.
        </Text>
        {guest.isError ? (
          <Text style={styles.error}>{mapSocialSignInError(guest.error)}</Text>
        ) : null}

        <View style={styles.dividerRow}>
          <View style={styles.line} />
          <Text style={styles.dividerText}>계정이 있다면</Text>
          <View style={styles.line} />
        </View>

        <SocialButtons mode="signIn" disabled={guest.isPending} />

        {showEmail ? (
          <View style={styles.emailForm}>
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
              <Text style={styles.error}>
                이메일이나 비밀번호가 맞지 않아요. 다시 확인해 주세요.
              </Text>
            ) : null}

            <Button
              title="이메일로 로그인"
              variant="secondary"
              onPress={() => mutation.mutate()}
              disabled={!canSubmit}
              loading={mutation.isPending}
            />

            <Pressable onPress={() => navigation.navigate('Signup')} style={styles.linkRow}>
              <Text style={styles.linkMuted}>계정이 없나요? </Text>
              <Text style={styles.link}>회원가입</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={() => setShowEmail(true)} hitSlop={8} style={styles.linkRow}>
            <Text style={styles.linkMuted}>이메일로 로그인</Text>
          </Pressable>
        )}
      </ScrollView>
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
    color: colors.textStrong,
    marginTop: spacing.md,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  dividerText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  emailForm: {
    marginTop: spacing.lg,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
    marginTop: spacing.sm,
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
