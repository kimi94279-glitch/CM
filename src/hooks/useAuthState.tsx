import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import {
  createProfile,
  getMyProfile,
  suggestedNickname,
  updateMyNickname,
} from '../services/authService';
import { createSoloWorkspace, getMyWorkspace } from '../services/coupleService';
import { setMonitoringUser } from '../services/monitoring';
import { supabase } from '../services/supabase';
import type { Couple } from '../types/models';

// 온보딩 게이팅 상태 (FLOW_AUTH.md / UX_AUTH.md)
// solo = 1인 워크스페이스(앱 사용 가능), active = 커플 연결됨
// offline = 로그인은 돼 있는데 프로필·공간을 못 불러옴(인터넷 끊김 등) → 다시 시도 화면.
// 못 불러온 것을 "프로필 없음"으로 보면 이미 이름이 있는 사람에게 닉네임 화면이 뜬다(2026-10-31 에뮬레이터에서 발견).
export type OnboardingStatus =
  | 'loading'
  | 'unauthenticated'
  | 'offline'
  | 'no_profile'
  | 'solo'
  | 'active';

interface AuthState {
  status: OnboardingStatus;
  session: Session | null;
  workspace: Couple | null;
  // 프로필/워크스페이스 변경 후 게이팅 상태를 다시 계산한다.
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

// 들어오는 길을 짧게(2026-10-31 흐름 정리): 이름 화면·"누구랑 그릴까요" 화면을 거치지 않고 바로 지도 서랍으로.
async function resolveState(
  session: Session | null
): Promise<{ status: OnboardingStatus; workspace: Couple | null }> {
  if (!session) return { status: 'unauthenticated', workspace: null };
  const suggested = suggestedNickname(session);
  const profile = await getMyProfile();
  if (!profile) {
    // 이름은 묻지 않고 만든다 — 카카오·Apple 이름이 있으면 그걸로, 로그인 없이 시작했으면 빈 이름으로
    // (게스트는 같이 그리기를 못 하니 이름이 보일 일이 없다). 이메일로 가입해 이름을 알 수 없을 때만 이름 화면.
    if (session.user.is_anonymous || suggested) await createProfile(suggested);
    else return { status: 'no_profile', workspace: null };
  } else if (!profile.nickname.trim() && suggested) {
    // 로그인 없이 쓰다가 카카오·Apple 을 이은 사람: 그 이름을 붙인다(같이 그리는 사람에게 보이는 이름).
    await updateMyNickname(suggested).catch(() => {});
  }
  // "누구랑 그릴까요" 단계 없이 모두 혼자 쓰는 공간에서 시작한다 — 초대는 지도 서랍에서 언제든(받은 초대는 자동으로 이어짐).
  const workspace = (await getMyWorkspace()) ?? (await createSoloWorkspace());
  return { status: workspace.status === 'active' ? 'active' : 'solo', workspace };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<OnboardingStatus>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [workspace, setWorkspace] = useState<Couple | null>(null);
  const mounted = useRef(true);
  const queryClient = useQueryClient();
  const lastUserId = useRef<string | null>(null);
  // 마지막으로 확인된 상태 — 다시 확인하다 실패했을 때 쓰던 화면을 그대로 두기 위해
  const lastStatus = useRef<OnboardingStatus>('loading');

  const apply = useCallback(
    async (next: Session | null) => {
      // 다른 사람으로 바뀌거나(로그아웃·계정 삭제 후 재로그인) 로그아웃되면 이전 사람의 캐시를 비운다.
      const nextUserId = next?.user?.id ?? null;
      const sameUser = lastUserId.current === nextUserId;
      if (!sameUser) {
        if (lastUserId.current !== null) queryClient.clear();
        lastUserId.current = nextUserId;
        setMonitoringUser(nextUserId);
      }
      setSession(next);
      try {
        const resolved = await resolveState(next);
        if (mounted.current) {
          lastStatus.current = resolved.status;
          setStatus(resolved.status);
          setWorkspace(resolved.workspace);
        }
      } catch {
        // 불러오기 실패(인터넷 끊김 등). 같은 사람이 이미 지도를 쓰던 중이면 그 화면을 그대로 두고(다음에 다시 확인),
        // 처음 여는 중이면 "연결이 안 돼요" 화면으로. 프로필이 없다고 단정하지 않는다.
        if (!mounted.current) return;
        if (!next) {
          lastStatus.current = 'unauthenticated';
          setStatus('unauthenticated');
          setWorkspace(null);
          return;
        }
        const using = lastStatus.current === 'solo' || lastStatus.current === 'active';
        if (!using || !sameUser) {
          lastStatus.current = 'offline';
          setStatus('offline');
          setWorkspace(null);
        }
      }
    },
    [queryClient]
  );

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await apply(data.session);
  }, [apply]);

  useEffect(() => {
    mounted.current = true;
    // onAuthStateChange 는 구독 시 INITIAL_SESSION 이벤트를 비동기로 전달하므로
    // 초기 상태도 이 콜백에서 계산된다. (별도 초기 refresh 호출 불필요)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      apply(next);
    });
    return () => {
      mounted.current = false;
      sub.subscription.unsubscribe();
    };
  }, [apply]);

  // 혼자 쓰는 중이면 상대가 내 초대를 받아들였을 수 있고, 함께 쓰는 중이면 상대가 연결을 끊었을 수 있다
  // → 앱으로 돌아올 때 공간을 다시 확인한다.
  // 연결이 안 돼 멈춘 경우에도 앱으로 돌아오면 다시 확인한다.
  useEffect(() => {
    if (status !== 'solo' && status !== 'active' && status !== 'offline') return;
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') refresh();
    });
    return () => sub.remove();
  }, [status, refresh]);

  return (
    <AuthContext.Provider value={{ status, session, workspace, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
