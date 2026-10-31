import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation } from '@tanstack/react-query';
import React, { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { useMapHost } from '../components/MapHostContext';
import { PendingInviteNote } from '../components/PendingInviteNote';
import { SocialButtons } from '../components/SocialButtons';
import { TextField } from '../components/TextField';
import { colors, radius, shadows, spacing, typography } from '../constants/theme';
import { mapSocialSignInError, signInWithEmail, startAsGuest } from '../services/authService';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

// 첫 화면(2026-10-31 다시 그림): 말보다 지도를 먼저 보여 준다 — 화면 위쪽은 진짜 종이 지도(뒤의 MapHost, 움직여 볼 수 있음),
// 아래 종이 한 장에 한 줄 설명과 시작 버튼. 아이콘·구분선("계정이 있다면")·버튼 아래 설명 줄은 뺐다.
// 로그인 없이 시작(기본 기능 전부)이 먼저, 계정이 있으면 카카오·Apple, 이메일은 접어 둔다.
// 같이 그리기(초대)는 그때 로그인한다(LoginRequired). 성공 시 onAuthStateChange 가 게이팅을 전환한다.
export function LoginScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const map = useMapHost();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showEmail, setShowEmail] = useState(false);

  // 이 화면에 있는 동안만 뒤의 지도를 보인다
  useFocusEffect(
    useCallback(() => {
      map.show();
      return () => map.hide();
    }, [map])
  );

  const guest = useMutation({ mutationFn: startAsGuest });
  const mutation = useMutation({
    mutationFn: () => signInWithEmail(email.trim(), password),
  });
  const canSubmit =
    email.trim().length > 0 && password.length > 0 && !mutation.isPending && !guest.isPending;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      pointerEvents="box-none"
    >
      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
        <ScrollView
          bounces={false}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title} accessibilityRole="header">
            지도 위에 같이 그려요
          </Text>
          <Text style={styles.subtitle}>갈 곳을 꽂고, 가 볼 길을 그어 보는 종이 지도예요.</Text>

          <PendingInviteNote />

          <Button
            title="로그인 없이 시작하기"
            onPress={() => guest.mutate()}
            loading={guest.isPending}
          />
          {guest.isError ? (
            <Text style={styles.error}>{mapSocialSignInError(guest.error)}</Text>
          ) : null}

          <View style={styles.gap} />
          <SocialButtons mode="signIn" disabled={guest.isPending} />

          {showEmail ? (
            <View style={styles.emailForm}>
              <TextField
                label="이메일"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextField
                label="비밀번호"
                value={password}
                onChangeText={setPassword}
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
              <Pressable
                onPress={() => navigation.navigate('Signup')}
                hitSlop={8}
                style={styles.linkRow}
                accessibilityRole="button"
              >
                <Text style={styles.linkMuted}>계정이 없나요? </Text>
                <Text style={styles.link}>이메일로 가입</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => setShowEmail(true)}
              hitSlop={8}
              style={styles.linkRow}
              accessibilityRole="button"
            >
              <Text style={styles.linkMuted}>이메일로 로그인</Text>
            </Pressable>
          )}

          {/* 뒤의 지도 출처(ODbL) — 지도 오른쪽 아래 출처 표시가 이 종이에 가려지므로 여기에 적는다 */}
          <Text style={styles.credit}>지도 데이터 © OpenStreetMap 기여자 · OpenFreeMap</Text>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  // 지도 위에 놓인 종이 한 장(위 모서리만 둥글게, 떠 있는 그림자)
  sheet: {
    maxHeight: '78%',
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    ...shadows.lifted,
  },
  title: {
    ...typography.display,
    color: colors.textStrong,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  gap: { height: spacing.sm },
  emailForm: {
    marginTop: spacing.lg,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
    marginTop: spacing.sm,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
  },
  linkMuted: {
    ...typography.label,
    color: colors.textMuted,
  },
  link: {
    ...typography.label,
    color: colors.primary,
  },
  credit: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textFaint,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
