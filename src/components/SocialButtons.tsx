import { useMutation } from '@tanstack/react-query';
import * as AppleAuthentication from 'expo-apple-authentication';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, providerColors, radius, spacing, typography } from '../constants/theme';
import {
  isAppleSignInAvailable,
  linkApple,
  linkKakao,
  mapSocialSignInError,
  signInWithApple,
  signInWithKakao,
} from '../services/authService';

type Provider = 'kakao' | 'apple';

interface SocialButtonsProps {
  // signIn: 로그인 화면(새로 시작·기존 계정) / link: 게스트에 계정 붙이기(그린 지도 유지)
  mode: 'signIn' | 'link';
  disabled?: boolean;
  onSuccess?: () => void;
}

// 카카오(모든 기기) · Apple(iOS — 서드파티 로그인을 두면 App Store 가 요구) 버튼 묶음.
// 버튼 색은 각 서비스 가이드(providerColors · Apple 시스템 버튼).
export function SocialButtons({ mode, disabled = false, onSuccess }: SocialButtonsProps) {
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    isAppleSignInAvailable()
      .then(setAppleAvailable)
      .catch(() => setAppleAvailable(false));
  }, []);

  const social = useMutation({
    mutationFn: (provider: Provider) => {
      if (mode === 'link') return provider === 'kakao' ? linkKakao() : linkApple();
      return provider === 'kakao' ? signInWithKakao() : signInWithApple();
    },
    onSuccess: (result) => {
      if (result === 'ok') onSuccess?.();
    },
  });

  const busy = disabled || social.isPending;

  return (
    <View>
      <Pressable
        onPress={() => social.mutate('kakao')}
        disabled={busy}
        style={({ pressed }) => [styles.kakao, pressed && styles.pressed]}
        accessibilityRole="button"
      >
        {social.isPending && social.variables === 'kakao' ? (
          <ActivityIndicator color={providerColors.kakaoText} />
        ) : (
          <Text style={styles.kakaoText}>
            {mode === 'link' ? '카카오로 로그인하고 계속하기' : '카카오로 로그인'}
          </Text>
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
    </View>
  );
}

const BUTTON_HEIGHT = 50;

const styles = StyleSheet.create({
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
  error: {
    ...typography.caption,
    color: colors.danger,
    marginTop: spacing.sm,
  },
});
