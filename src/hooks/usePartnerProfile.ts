import { useQuery } from '@tanstack/react-query';

import { getUserProfile } from '../services/authService';
import { useAuth } from './useAuthState';

// 지금 같이 그리는 사람 uid. 솔로/미연결이면 null.
export function usePartnerId(): string | null {
  const { session, workspace } = useAuth();
  const myId = session?.user?.id ?? null;
  if (workspace?.status !== 'active') return null;
  return workspace.user_a_id === myId ? workspace.user_b_id : workspace.user_a_id;
}

// 현재 워크스페이스의 상대 프로필(작성자 표시용 닉네임·잉크). 솔로/미연결이면 null.
export function usePartnerProfile() {
  const partnerId = usePartnerId();

  return useQuery({
    queryKey: ['partner-profile', partnerId],
    queryFn: () => getUserProfile(partnerId as string),
    enabled: !!partnerId,
    staleTime: 5 * 60_000,
  });
}
