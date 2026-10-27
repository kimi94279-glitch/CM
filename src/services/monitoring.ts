import * as Sentry from '@sentry/react-native';
import type React from 'react';

// 오류 수집(Sentry). EXPO_PUBLIC_SENTRY_DSN 이 있을 때만 켜진다 — 없으면 아래 함수는 모두 아무 일도 하지 않는다.
// 개인정보: 기본 PII(IP 등)는 보내지 않고, 사용자는 내부 uid 로만 구분한다(닉네임·이메일 미전송).
const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

export function initMonitoring(): void {
  if (!DSN) return;
  Sentry.init({
    dsn: DSN,
    sendDefaultPii: false,
    environment: __DEV__ ? 'development' : 'production',
    // 오류만 모은다(성능 추적·세션 리플레이 끔).
    tracesSampleRate: 0,
  });
}

// 앱 최상위 컴포넌트 감싸기(터치·화면 흐름 브레드크럼, 네이티브 크래시 연결)
export function wrapRoot<P extends Record<string, unknown>>(
  Root: React.ComponentType<P>
): React.ComponentType<P> {
  return DSN ? Sentry.wrap(Root) : Root;
}

export function reportError(error: unknown, extra?: Record<string, unknown>): void {
  if (!DSN) return;
  Sentry.captureException(error, extra ? { extra } : undefined);
}

export function reportMessage(message: string, extra?: Record<string, unknown>): void {
  if (!DSN) return;
  Sentry.captureMessage(message, { level: 'warning', extra });
}

export function setMonitoringUser(userId: string | null): void {
  if (!DSN) return;
  Sentry.setUser(userId ? { id: userId } : null);
}
