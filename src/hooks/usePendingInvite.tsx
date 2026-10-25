import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NavigationContainerRefWithCurrent } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { INVITE_EXPIRY_HOURS } from '../constants/config';
import type { RootStackParamList } from '../navigation/types';
import { parseInviteUrl } from '../utils/invite';
import { useAuth } from './useAuthState';

// 받은 초대 코드 보존 (FLOW_AUTH.md §5-4)
// 로그인 전·가입 중에 연 초대 링크의 코드를 기억해 두었다가(앱을 껐다 켜도 유지),
// 지도를 쓸 수 있는 단계(no_workspace / solo)가 되면 초대 화면으로 이어 준다.
// 수락은 자동으로 하지 않는다 — 혼자 그리던 지도가 합쳐지므로 화면에서 한 번 확인받는다.
const STORAGE_KEY = 'pending-invite';
const MAX_AGE_MS = INVITE_EXPIRY_HOURS * 60 * 60 * 1000;

interface PendingInviteState {
  token: string | null;
  clear: () => void;
}

const PendingInviteContext = createContext<PendingInviteState | undefined>(undefined);

export function PendingInviteProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    // 앱을 연 링크 / 켜져 있을 때 들어온 링크 → 기억
    const remember = (url: string | null) => {
      const next = url ? parseInviteUrl(url) : null;
      if (!next || !alive) return;
      // 다시 불러오기(reload) 때 같은 링크가 또 들어오지 않게 비운다
      Linking.clearInitialURL();
      setToken(next);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ token: next, savedAt: Date.now() })).catch(
        () => {}
      );
    };

    // 저장본 복원 (링크로 이미 받은 코드가 있으면 그쪽이 최신)
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw || !alive) return;
        const saved = JSON.parse(raw) as { token?: string; savedAt?: number };
        if (saved.token && saved.savedAt && Date.now() - saved.savedAt < MAX_AGE_MS) {
          const restored = saved.token;
          setToken((cur) => cur ?? restored);
        } else {
          AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
        }
      })
      .catch(() => {});

    // getLinkingURL 은 clearInitialURL 로 비워지는 쪽(RN getInitialURL 은 reload 후에도 남는다)
    Promise.resolve()
      .then(() => remember(Linking.getLinkingURL()))
      .catch(() => {});
    const sub = Linking.addEventListener('url', ({ url }) => remember(url));

    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  const clear = useCallback(() => {
    setToken(null);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }, []);

  return (
    <PendingInviteContext.Provider value={{ token, clear }}>
      {children}
    </PendingInviteContext.Provider>
  );
}

export function usePendingInvite(): PendingInviteState {
  const ctx = useContext(PendingInviteContext);
  if (!ctx) throw new Error('usePendingInvite must be used within PendingInviteProvider');
  return ctx;
}

// 기억해 둔 코드를 초대 화면으로 넘긴다. 게이팅이 바뀌면 스택(화면 집합)도 바뀌므로,
// InviteJoin 이 실제로 스택에 올라온 뒤(state 이벤트)에 이동한다.
export function usePendingInviteRouting(
  navigationRef: NavigationContainerRefWithCurrent<RootStackParamList>,
  navReady: boolean
) {
  const { status } = useAuth();
  const { token, clear } = usePendingInvite();
  const [navTick, setNavTick] = useState(0);

  useEffect(() => {
    if (!navReady) return;
    return navigationRef.addListener('state', () => setNavTick((n) => n + 1));
  }, [navigationRef, navReady]);

  useEffect(() => {
    if (!token || !navReady || !navigationRef.isReady()) return;

    if (status === 'active') {
      clear();
      Alert.alert('이미 같이 그리는 사람이 있어요', '지금은 한 사람과만 지도를 함께 쓸 수 있어요.');
      return;
    }
    if (status !== 'no_workspace' && status !== 'solo') return; // 로그인·프로필 단계 — 기다린다

    const routeNames = navigationRef.getRootState()?.routeNames ?? [];
    if (!routeNames.includes('InviteJoin')) return;
    navigationRef.navigate('InviteJoin', { token });
    clear();
  }, [token, navReady, status, navTick, navigationRef, clear]);
}
