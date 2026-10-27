import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { LoginRequired } from '../components/LoginRequired';
import { ScreenContainer } from '../components/ScreenContainer';
import { TextField } from '../components/TextField';
import { INVITE_TOKEN_LENGTH } from '../constants/config';
import { colors, radius, spacing, typography } from '../constants/theme';
import { useAuth } from '../hooks/useAuthState';
import { useBoards } from '../hooks/useBoards';
import {
  acceptInvite,
  describeInvitePreview,
  getInvitePreview,
  mapAcceptInviteError,
} from '../services/coupleService';
import { isGuest } from '../services/authService';
import type { RootStackParamList } from '../navigation/types';
import { extractInviteCode, formatInviteCode, normalizeInviteCode } from '../utils/invite';

type Props = NativeStackScreenProps<RootStackParamList, 'InviteJoin'>;

// 같이 그리기는 로그인한 사람만 — 게스트면 로그인 안내. 로그인하면 지도가 그대로 이어진 채 이 화면이 열린다.
export function InviteJoinScreen(props: Props) {
  const { session } = useAuth();
  if (isGuest(session)) {
    return (
      <ScreenContainer>
        <LoginRequired />
      </ScreenContainer>
    );
  }
  return <InviteJoinContent {...props} />;
}

function InviteJoinContent({ route }: Props) {
  const { refresh, workspace } = useAuth();
  const queryClient = useQueryClient();

  // 초대 링크로 들어오면 코드를 채워 둔다. 화면이 열린 채 새 링크가 오면 그 코드로 바꾼다.
  const paramToken = route.params?.token ?? '';
  const [code, setCode] = useState(paramToken ? formatInviteCode(paramToken) : '');
  const [seenParam, setSeenParam] = useState(paramToken);
  if (paramToken !== seenParam) {
    setSeenParam(paramToken);
    if (paramToken) setCode(formatInviteCode(paramToken));
  }
  const [pasteMiss, setPasteMiss] = useState(false);

  const token = normalizeInviteCode(code);
  const complete = token.length === INVITE_TOKEN_LENGTH;

  // 코드가 다 들어오면 누가 보낸 초대인지 먼저 보여준다 (0008 invite_preview)
  const preview = useQuery({
    queryKey: ['invite-preview', token],
    queryFn: () => getInvitePreview(token),
    enabled: complete,
    retry: false,
    staleTime: 30_000,
  });
  const previewNote = preview.data ? describeInvitePreview(preview.data) : null;

  // 혼자 그리던 보드는 함께 쓰는 공간으로 옮겨진다 → 미리 알려 준다
  const isSolo = workspace?.status === 'solo';
  const boardsQuery = useBoards(isSolo ? workspace?.id : undefined);
  const myBoardCount = boardsQuery.data?.length ?? 0;

  // 수락 성공 → 함께 쓰는 공간이 생겨 게이팅이 목록으로 전환된다
  const mutation = useMutation({
    mutationFn: () => acceptInvite(token),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['boards'] });
      await refresh();
    },
  });

  const onChangeCode = (text: string) => {
    setCode(text);
    setPasteMiss(false);
  };

  // 받은 메시지를 통째로 복사해 와도 링크·코드에서 찾아낸다
  const onPaste = async () => {
    const text = await Clipboard.getStringAsync();
    const found = extractInviteCode(text);
    if (found) {
      setCode(formatInviteCode(found));
      setPasteMiss(false);
    } else {
      setPasteMiss(true);
    }
  };

  // 미리보기가 안 되면(네트워크 등) 수락에서 다시 확인하므로 막지 않는다
  const previewBlocks = !!preview.data && preview.data.state !== 'ok';
  const canSubmit = complete && !previewBlocks && !preview.isLoading && !mutation.isPending;

  return (
    <ScreenContainer>
      <Text style={styles.title}>받은 초대</Text>
      <Text style={styles.desc}>초대 코드를 넣으면 같이 그릴 수 있어요</Text>

      <TextField
        value={code}
        onChangeText={onChangeCode}
        placeholder="ABCD EFGH"
        autoCapitalize="characters"
        autoFocus={!paramToken}
      />
      <Pressable onPress={onPaste} hitSlop={8} style={styles.pasteRow}>
        <Text style={styles.paste}>📋 붙여넣기</Text>
      </Pressable>
      {pasteMiss ? (
        <Text style={styles.hint}>복사한 내용에서 초대 코드를 찾지 못했어요.</Text>
      ) : null}

      {complete ? (
        <View style={styles.previewBox}>
          {preview.isLoading ? (
            <ActivityIndicator color={colors.textMuted} />
          ) : preview.data?.state === 'ok' ? (
            <>
              <Text style={styles.previewTitle}>
                ✏️ {preview.data.inviter_name ?? '상대'}님이 같이 그리자고 해요
              </Text>
              {isSolo && myBoardCount > 0 ? (
                <Text style={styles.previewNote}>
                  혼자 그리던 지도 {myBoardCount}개도 함께 보게 돼요.
                </Text>
              ) : null}
            </>
          ) : previewNote ? (
            <Text style={styles.previewWarn}>{previewNote}</Text>
          ) : (
            <Text style={styles.previewNote}>연결하면 같은 지도에 같이 그릴 수 있어요.</Text>
          )}
        </View>
      ) : null}

      {mutation.isError ? (
        <Text style={styles.error}>{mapAcceptInviteError(mutation.error)}</Text>
      ) : null}

      <Button
        title="같이 그리기"
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
  },
  desc: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  pasteRow: {
    alignSelf: 'flex-start',
    marginTop: -spacing.xs,
    marginBottom: spacing.md,
  },
  paste: {
    ...typography.label,
    color: colors.textStrong,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  previewBox: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.md,
    minHeight: 56,
    justifyContent: 'center',
  },
  previewTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textStrong,
  },
  previewNote: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  previewWarn: {
    ...typography.body,
    color: colors.warning,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
    marginBottom: spacing.sm,
  },
});
