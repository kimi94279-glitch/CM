import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { colors } from '../constants/theme';
import { useAuth } from '../hooks/useAuthState';
import { BoardDetailScreen } from '../screens/BoardDetailScreen';
import { BoardListScreen } from '../screens/BoardListScreen';
import { CoupleConnectScreen } from '../screens/CoupleConnectScreen';
import { CreateBoardScreen } from '../screens/CreateBoardScreen';
import { InviteCreateScreen } from '../screens/InviteCreateScreen';
import { PlaceAddScreen } from '../screens/PlaceAddScreen';
import { InviteJoinScreen } from '../screens/InviteJoinScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { ProfileSetupScreen } from '../screens/ProfileSetupScreen';
import { SignupScreen } from '../screens/SignupScreen';
import { SplashScreen } from '../screens/SplashScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

// 온보딩 게이팅: status 에 따라 진입 가능한 화면 집합을 전환한다.
// (Login → ProfileSetup → CoupleConnect → Home)
export function RootNavigator() {
  const { status } = useAuth();

  if (status === 'loading') {
    return <SplashScreen />;
  }

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}
    >
      {status === 'unauthenticated' && (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
        </>
      )}

      {status === 'no_profile' && (
        <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      )}

      {/* 워크스페이스 없음: 초대하기 / 먼저 둘러보기(솔로 생성) / 코드 입력 */}
      {status === 'no_workspace' && (
        <>
          <Stack.Screen name="CoupleConnect" component={CoupleConnectScreen} />
          <Stack.Screen name="InviteCreate" component={InviteCreateScreen} />
          <Stack.Screen name="InviteJoin" component={InviteJoinScreen} />
        </>
      )}

      {/* 솔로: 앱 사용 가능 + 언제든 상대 초대(전환) 가능 */}
      {status === 'solo' && (
        <>
          <Stack.Screen name="BoardList" component={BoardListScreen} />
          <Stack.Screen name="CreateBoard" component={CreateBoardScreen} />
          <Stack.Screen name="BoardDetail" component={BoardDetailScreen} />
          <Stack.Screen name="PlaceAdd" component={PlaceAddScreen} />
          <Stack.Screen name="InviteCreate" component={InviteCreateScreen} />
        </>
      )}

      {/* 커플 연결됨 */}
      {status === 'active' && (
        <>
          <Stack.Screen name="BoardList" component={BoardListScreen} />
          <Stack.Screen name="CreateBoard" component={CreateBoardScreen} />
          <Stack.Screen name="BoardDetail" component={BoardDetailScreen} />
          <Stack.Screen name="PlaceAdd" component={PlaceAddScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
