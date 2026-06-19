import { DefaultTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { MapHost } from './src/components/MapHost';
import { AuthProvider } from './src/hooks/useAuthState';
import { linking } from './src/navigation/linking';
import { RootNavigator } from './src/navigation/RootNavigator';
import { SplashScreen } from './src/screens/SplashScreen';

const queryClient = new QueryClient();

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
  useEffect(() => {
    const sub = AppState.addEventListener('change', onAppStateChange);
    return () => sub.remove();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <AuthProvider>
          <MapHost>
            <NavigationContainer theme={navTheme} linking={linking} fallback={<SplashScreen />}>
              <RootNavigator />
            </NavigationContainer>
          </MapHost>
          <StatusBar style="auto" />
        </AuthProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
