import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Button } from '../components/Button';
import { ScreenContainer } from '../components/ScreenContainer';
import { TextField } from '../components/TextField';
import { colors, spacing, typography } from '../constants/theme';
import { useAuth } from '../hooks/useAuthState';
import { useCreateBoard, useRenameBoard } from '../hooks/useBoards';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateBoard'>;

const TITLE_MAX = 40;

// 새 지도 만들기 / 이름 바꾸기(route.params.boardId 가 있을 때) 겸용
export function CreateBoardScreen({ navigation, route }: Props) {
  const { workspace } = useAuth();
  const editing = route.params;
  const [title, setTitle] = useState(editing?.title ?? '');

  const createMutation = useCreateBoard(workspace?.id);
  const renameMutation = useRenameBoard(workspace?.id);
  const mutation = editing ? renameMutation : createMutation;

  const trimmed = title.trim();
  const tooLong = trimmed.length > TITLE_MAX;
  const unchanged = !!editing && trimmed === editing.title;
  const canSubmit = trimmed.length > 0 && !tooLong && !unchanged && !mutation.isPending;

  const onSubmit = () => {
    const onSuccess = () => navigation.goBack();
    if (editing) {
      renameMutation.mutate({ boardId: editing.boardId, title: trimmed }, { onSuccess });
    } else {
      createMutation.mutate(trimmed, { onSuccess });
    }
  };

  return (
    <ScreenContainer>
      <Text style={styles.title}>{editing ? '지도 이름 바꾸기' : '어떤 지도를 그려 볼까요?'}</Text>

      <TextField
        value={title}
        onChangeText={setTitle}
        placeholder="예: 토요일 성수 산책"
        autoFocus
        error={tooLong ? `${TITLE_MAX}자 이내로 입력해주세요.` : null}
      />

      {mutation.isError ? (
        <Text style={styles.error}>
          {editing ? '이름을 바꾸지 못했어요.' : '만들지 못했어요.'} 다시 시도해 주세요.
        </Text>
      ) : null}

      <Button
        title={editing ? '바꾸기' : '만들기'}
        onPress={onSubmit}
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
