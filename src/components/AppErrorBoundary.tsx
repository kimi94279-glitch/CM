import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '../constants/theme';
import { reportError } from '../services/monitoring';
import { Button } from './Button';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

// 화면을 그리다 예외가 나면 앱 전체가 하얗게 멈추는 대신 "다시 시도" 화면을 보여준다.
// 오류는 Sentry 로 보낸다(services/monitoring — DSN 이 있을 때만).
export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[AppErrorBoundary]', error, info.componentStack);
    reportError(error, { componentStack: info.componentStack });
  }

  private reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.body}>
          <Text style={styles.title}>화면을 그리다 멈췄어요</Text>
          <Text style={styles.desc}>
            다시 열면 대부분 돌아와요. 그래도 같은 화면이 나오면 앱을 껐다 켜 주세요. 그린 지도는
            지워지지 않아요.
          </Text>
          <Button title="다시 열기" onPress={this.reset} style={styles.button} />
        </View>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  // 가운데 큰 이모지 + 제목 + 회색 줄(흔한 틀) 대신 위쪽 왼쪽 정렬
  body: {
    flex: 1,
    padding: spacing.lg,
    paddingTop: spacing.xl * 2,
  },
  title: {
    ...typography.title,
    color: colors.textStrong,
  },
  desc: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  button: {
    alignSelf: 'flex-start',
    marginTop: spacing.lg,
  },
});
