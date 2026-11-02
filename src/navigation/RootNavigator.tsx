import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { colors } from '../constants/theme';
import { useAuth } from '../hooks/useAuthState';
import { BoardDetailScreen } from '../screens/BoardDetailScreen';
import { BoardListScreen } from '../screens/BoardListScreen';
import { CreateBoardScreen } from '../screens/CreateBoardScreen';
import { InviteCreateScreen } from '../screens/InviteCreateScreen';
import { PlaceAddScreen } from '../screens/PlaceAddScreen';
import { InviteJoinScreen } from '../screens/InviteJoinScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { OfflineScreen } from '../screens/OfflineScreen';
import { ProfileSetupScreen } from '../screens/ProfileSetupScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { SignupScreen } from '../screens/SignupScreen';
import { SplashScreen } from '../screens/SplashScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

// 뒤의 지도(MapHost)가 보이고 만져지는 화면(지도 화면·첫 화면): 투명 + 빈 곳의 터치를 지도로 넘긴다.
// pointerEvents 는 iOS 에서 화면 내용 감싸개에 그대로 먹고, 안드로이드는 감싸개가 이 값을 안 받아서
// patches/react-native-screens 로 감싸개가 터치를 가져가지 않게 했다(2026-11-01 실기기에서 지도가 안 움직이던 원인).
const MAP_SCREEN_OPTIONS = {
  contentStyle: { backgroundColor: 'transparent', pointerEvents: 'box-none' as const },
};

// 온보딩 게이팅: status 에 따라 진입 가능한 화면 집합을 전환한다.
// (Login → [이메일 가입만 ProfileSetup] → 지도 서랍). "누구랑 그릴까요"(CoupleConnect) 단계는 2026-10-31 뺐다.
export function RootNavigator() {
  const { status } = useAuth();

  if (status === 'loading') {
    return <SplashScreen />;
  }
  if (status === 'offline') {
    return <OfflineScreen />;
  }

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}
    >
      {/* 첫 화면은 투명 — 뒤의 지도(MapHost)가 비쳐 보인다 */}
      {status === 'unauthenticated' && (
        <>
          <Stack.Screen name="Login" component={LoginScreen} options={MAP_SCREEN_OPTIONS} />
          <Stack.Screen name="Signup" component={SignupScreen} />
        </>
      )}

      {/* 이메일로 가입해 이름을 알 수 없을 때만 */}
      {status === 'no_profile' && (
        <>
          <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </>
      )}

      {/* 솔로: 앱 사용 가능 + 언제든 상대 초대(전환) 또는 받은 코드로 합류 가능 */}
      {status === 'solo' && (
        <>
          <Stack.Screen name="BoardList" component={BoardListScreen} />
          <Stack.Screen name="CreateBoard" component={CreateBoardScreen} />
          <Stack.Screen
            name="BoardDetail"
            component={BoardDetailScreen}
            options={MAP_SCREEN_OPTIONS}
          />
          <Stack.Screen name="PlaceAdd" component={PlaceAddScreen} />
          <Stack.Screen name="InviteCreate" component={InviteCreateScreen} />
          <Stack.Screen name="InviteJoin" component={InviteJoinScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </>
      )}

      {/* 커플 연결됨 */}
      {status === 'active' && (
        <>
          <Stack.Screen name="BoardList" component={BoardListScreen} />
          <Stack.Screen name="CreateBoard" component={CreateBoardScreen} />
          <Stack.Screen
            name="BoardDetail"
            component={BoardDetailScreen}
            options={MAP_SCREEN_OPTIONS}
          />
          <Stack.Screen name="PlaceAdd" component={PlaceAddScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
