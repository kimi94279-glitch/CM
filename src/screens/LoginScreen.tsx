import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation } from '@tanstack/react-query';
import * as AppleAuthentication from 'expo-apple-authentication';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { PendingInviteNote } from '../components/PendingInviteNote';
import { ScreenContainer } from '../components/ScreenContainer';
import { TextField } from '../components/TextField';
import { colors, providerColors, radius, spacing, typography } from '../constants/theme';
import {
  isAppleSignInAvailable,
  mapSocialSignInError,
  signInWithApple,
  signInWithEmail,
  signInWithKakao,
} from '../services/authService';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

type Provider = 'kakao' | 'apple';

// 로그인 성공 시 onAuthStateChange 가 게이팅 상태를 전환한다.
// 카카오(모든 기기) · Apple(iOS — 서드파티 로그인을 두면 App Store 가 요구) · 이메일(접어 둠)
export function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showEmail, setShowEmail] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    isAppleSignInAvailable()
      .then(setAppleAvailable)
      .catch(() => setAppleAvailable(false));
  }, []);

  const social = useMutation({
    mutationFn: (provider: Provider) =>
      provider === 'kakao' ? signInWithKakao() : signInWithApple(),
  });

  const mutation = useMutation({
    mutationFn: () => signInWithEmail(email.trim(), password),
  });

  const busy = social.isPending || mutation.isPending;
  const canSubmit = email.trim().length > 0 && password.length > 0 && !busy;

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>Couple Map</Text>
        <Text style={styles.subtitle}>지도 위에 같이 그려요</Text>
      </View>

      <PendingInviteNote />

      <Pressable
        onPress={() => social.mutate('kakao')}
        disabled={busy}
        style={({ pressed }) => [styles.kakao, pressed && styles.pressed]}
        accessibilityRole="button"
      >
        {social.isPending && social.variables === 'kakao' ? (
          <ActivityIndicator color={providerColors.kakaoText} />
        ) : (
          <Text style={styles.kakaoText}>카카오로 시작하기</Text>
        )}
      </Pressable>

      {appleAvailable ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={radius.button}
          style={styles.apple}
          onPress={() => {
            if (!busy) social.mutate('apple');
          }}
        />
      ) : null}

      {social.isError ? (
        <Text style={styles.error}>{mapSocialSignInError(social.error)}</Text>
      ) : null}

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
            <Text style={styles.error}>이메일 또는 비밀번호를 확인해주세요.</Text>
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
    </ScreenContainer>
  );
}

const BUTTON_HEIGHT = 50;

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
  kakao: {
    height: BUTTON_HEIGHT,
    borderRadius: radius.button,
    backgroundColor: providerColors.kakao,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kakaoText: {
    ...typography.body,
    fontWeight: '600',
    color: providerColors.kakaoText,
  },
  pressed: {
    opacity: 0.85,
  },
  apple: {
    height: BUTTON_HEIGHT,
    width: '100%',
    marginTop: spacing.sm,
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
