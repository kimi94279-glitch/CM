import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { ScreenContainer } from '../components/ScreenContainer';
import { colors, spacing, typography } from '../constants/theme';
import { useAuth } from '../hooks/useAuthState';

// 로그인은 돼 있는데 내 정보·지도를 못 불러왔을 때(인터넷 끊김 등). 닉네임 화면으로 보내지 않고 다시 시도만 하게 한다.
// 앱으로 다시 돌아오면 저절로 한 번 더 확인한다(useAuthState).
export function OfflineScreen() {
  const { refresh } = useAuth();
  const [retrying, setRetrying] = useState(false);
  const retry = async () => {
    setRetrying(true);
    try {
      await refresh();
    } finally {
      setRetrying(false);
    }
  };
  return (
    <ScreenContainer>
      <View style={styles.body}>
        <Text style={styles.title} accessibilityRole="header">
          지도를 불러오지 못했어요
        </Text>
        <Text style={styles.desc}>
          인터넷 연결을 확인하고 다시 시도해 주세요. 그려 둔 지도는 그대로 있어요.
        </Text>
        <Button title="다시 시도" onPress={retry} loading={retrying} style={styles.button} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: { paddingTop: spacing.xl * 2 },
  title: { ...typography.title, color: colors.textStrong },
  desc: { ...typography.body, color: colors.textMuted, marginTop: spacing.sm },
  button: { alignSelf: 'flex-start', marginTop: spacing.lg },
});
