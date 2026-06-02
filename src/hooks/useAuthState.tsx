import type { Session } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { getMyProfile } from '../services/authService';
import { getMyWorkspace } from '../services/coupleService';
import { supabase } from '../services/supabase';
import type { Couple } from '../types/models';

// 온보딩 게이팅 상태 (FLOW_AUTH.md / UX_AUTH.md)
// solo = 1인 워크스페이스(앱 사용 가능), active = 커플 연결됨
export type OnboardingStatus =
  | 'loading'
  | 'unauthenticated'
  | 'no_profile'
  | 'no_workspace'
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

async function resolveState(
  session: Session | null
): Promise<{ status: OnboardingStatus; workspace: Couple | null }> {
  if (!session) return { status: 'unauthenticated', workspace: null };
  const profile = await getMyProfile();
  if (!profile) return { status: 'no_profile', workspace: null };
  const workspace = await getMyWorkspace();
  if (!workspace) return { status: 'no_workspace', workspace: null };
  return { status: workspace.status === 'active' ? 'active' : 'solo', workspace };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<OnboardingStatus>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [workspace, setWorkspace] = useState<Couple | null>(null);
  const mounted = useRef(true);

  const apply = useCallback(async (next: Session | null) => {
    setSession(next);
    try {
      const resolved = await resolveState(next);
      if (mounted.current) {
        setStatus(resolved.status);
        setWorkspace(resolved.workspace);
      }
    } catch {
      // 상태 계산 실패 시 안전하게 폴백한다.
      if (mounted.current) {
        setStatus(next ? 'no_profile' : 'unauthenticated');
        setWorkspace(null);
      }
    }
  }, []);

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
