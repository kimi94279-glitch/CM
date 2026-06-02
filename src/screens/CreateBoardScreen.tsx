import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Button } from '../components/Button';
import { ScreenContainer } from '../components/ScreenContainer';
import { TextField } from '../components/TextField';
import { colors, spacing, typography } from '../constants/theme';
import { useAuth } from '../hooks/useAuthState';
import { useCreateBoard } from '../hooks/useBoards';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateBoard'>;

const TITLE_MAX = 40;

export function CreateBoardScreen({ navigation }: Props) {
  const { workspace } = useAuth();
  const [title, setTitle] = useState('');

  const mutation = useCreateBoard(workspace?.id);

  const trimmed = title.trim();
  const tooLong = trimmed.length > TITLE_MAX;
  const canSubmit = trimmed.length > 0 && !tooLong && !mutation.isPending;

  const onCreate = () => {
    mutation.mutate(trimmed, { onSuccess: () => navigation.goBack() });
  };

  return (
    <ScreenContainer>
      <Text style={styles.title}>어떤 데이트를 계획해볼까요?</Text>

      <TextField
        value={title}
        onChangeText={setTitle}
        placeholder="예: 토요일 성수 데이트"
        autoFocus
        error={tooLong ? `${TITLE_MAX}자 이내로 입력해주세요.` : null}
      />

      {mutation.isError ? (
        <Text style={styles.error}>생성에 실패했어요. 다시 시도해주세요.</Text>
      ) : null}

      <Button
        title="만들기"
        onPress={onCreate}
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
