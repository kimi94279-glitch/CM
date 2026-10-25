import {
  createNavigationContainerRef,
  DefaultTheme,
  NavigationContainer,
  type Theme,
} from '@react-navigation/native';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { MapHost } from './src/components/MapHost';
import { AuthProvider } from './src/hooks/useAuthState';
import { PendingInviteProvider, usePendingInviteRouting } from './src/hooks/usePendingInvite';
import {
  usePushNavigation,
  usePushRefresh,
  usePushRegistration,
} from './src/hooks/usePushNotifications';
import { RootNavigator } from './src/navigation/RootNavigator';
import type { RootStackParamList } from './src/navigation/types';
import { SplashScreen } from './src/screens/SplashScreen';

const queryClient = new QueryClient();

// 알림 탭 → 화면 이동은 화면 밖(App)에서 일어나므로 컨테이너 ref 로 네비게이션한다.
const navigationRef = createNavigationContainerRef<RootStackParamList>();

// 푸시 알림 배선(토큰 등록 · 수신 시 갱신 · 탭 시 이동). AuthProvider/QueryClient 안쪽이어야 한다.
function PushNotifications({ navReady }: { navReady: boolean }) {
  usePushRegistration();
  usePushRefresh();
  usePushNavigation(navigationRef, navReady);
  return null;
}

// 초대 링크 배선: 받은 코드를 기억했다가 초대 화면으로 이어 준다.
function PendingInviteLinks({ navReady }: { navReady: boolean }) {
  usePendingInviteRouting(navigationRef, navReady);
  return null;
}

// 네비게이터 배경을 투명화 → BoardDetail(투명 화면) 뒤의 싱글톤 MapHost가 비쳐 보인다.
// 비지도 화면은 각자/기본 contentStyle(불투명)로 지도를 가린다(RootNavigator).
const navTheme: Theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: 'transparent' },
};

// RN에는 브라우저 window focus 가 없으므로 AppState 로 focusManager 를 구동한다.
// → 앱을 다시 열면(active 복귀) refetchOnWindowFocus 가 동작해 상대 반응이 반영된다.
function onAppStateChange(status: AppStateStatus) {
  focusManager.setFocused(status === 'active');
}

export default function App() {
  // 네비게이터가 처음 마운트된 뒤(onReady)에만 알림 탭 이동을 처리한다.
  const [navReady, setNavReady] = useState(false);

  useEffect(() => {
    const sub = AppState.addEventListener('change', onAppStateChange);
    return () => sub.remove();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <AuthProvider>
          <PendingInviteProvider>
            <PushNotifications navReady={navReady} />
            <PendingInviteLinks navReady={navReady} />
            <MapHost>
              <NavigationContainer
                ref={navigationRef}
                theme={navTheme}
                fallback={<SplashScreen />}
                onReady={() => setNavReady(true)}
              >
                <RootNavigator />
              </NavigationContainer>
            </MapHost>
            <StatusBar style="auto" />
          </PendingInviteProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
