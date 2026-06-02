import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import React, { useState } from 'react';
import { ActivityIndicator, Share, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { ScreenContainer } from '../components/ScreenContainer';
import { colors, radius, spacing, typography } from '../constants/theme';
import { useAuth } from '../hooks/useAuthState';
import { createInvite } from '../services/coupleService';
import { buildInviteLink, formatInviteCode } from '../utils/invite';

export function InviteCreateScreen() {
  const { refresh } = useAuth();
  const [showNotYet, setShowNotYet] = useState(false);
  const [checking, setChecking] = useState(false);

  // 마운트 시 1회 초대 생성 (staleTime Infinity 로 중복 INSERT 방지)
  const inviteQuery = useQuery({
    queryKey: ['couple-invite'],
    queryFn: createInvite,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });

  const token = inviteQuery.data?.invite_token ?? '';
  const link = token ? buildInviteLink(token) : '';

  const onCopy = async () => {
    if (token) await Clipboard.setStringAsync(token);
  };

  const onShare = async () => {
    if (link) await Share.share({ message: `Couple Map 초대: ${link}` });
  };

  // 상대가 수락하면 active 커플이 생겨 게이팅이 Home 으로 전환된다.
  // 전환되지 않으면(아직 미수락) 이 화면이 유지되어 안내를 표시한다.
  const onCheckConnection = async () => {
    setChecking(true);
    setShowNotYet(false);
    try {
      await refresh();
      setShowNotYet(true);
    } finally {
      setChecking(false);
    }
  };

  if (inviteQuery.isLoading) {
    return (
      <ScreenContainer style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </ScreenContainer>
    );
  }

  if (inviteQuery.isError) {
    return (
      <ScreenContainer>
        <Text style={styles.error}>초대 생성에 실패했어요.</Text>
        <Button title="다시 시도" onPress={() => inviteQuery.refetch()} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Text style={styles.title}>상대 초대하기</Text>
      <Text style={styles.desc}>이 코드를 상대에게 보내주세요</Text>

      <View style={styles.codeBox}>
        <Text style={styles.code}>{formatInviteCode(token)}</Text>
      </View>

      <Button title="링크 공유하기" onPress={onShare} />
      <Button title="코드 복사" variant="secondary" onPress={onCopy} style={styles.gap} />

      <Text style={styles.waiting}>⏳ 상대가 수락하면 연결돼요</Text>

      <View style={styles.checkArea}>
        <Button title="연결 확인" variant="ghost" onPress={onCheckConnection} loading={checking} />
        {showNotYet ? <Text style={styles.notYet}>아직 상대가 수락하지 않았어요.</Text> : null}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  codeBox: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.card,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  code: {
    ...typography.display,
    color: colors.primary,
    letterSpacing: 4,
  },
  gap: {
    marginTop: spacing.md,
  },
  waiting: {
    ...typography.label,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  checkArea: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  notYet: {
    ...typography.caption,
    color: colors.warning,
    marginTop: spacing.sm,
  },
  error: {
    ...typography.body,
    color: colors.danger,
    marginVertical: spacing.md,
  },
});
