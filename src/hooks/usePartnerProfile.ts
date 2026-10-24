import { useQuery } from '@tanstack/react-query';

import { getUserProfile } from '../services/authService';
import { useAuth } from './useAuthState';

// 현재 워크스페이스의 상대 프로필(작성자 표시용 닉네임). 솔로/미연결이면 null.
export function usePartnerProfile() {
  const { session, workspace } = useAuth();
  const myId = session?.user?.id ?? null;
  const partnerId =
    workspace?.status === 'active'
      ? workspace.user_a_id === myId
        ? workspace.user_b_id
        : workspace.user_a_id
      : null;

  return useQuery({
    queryKey: ['partner-profile', partnerId],
    queryFn: () => getUserProfile(partnerId as string),
    enabled: !!partnerId,
    staleTime: 5 * 60_000,
  });
}
