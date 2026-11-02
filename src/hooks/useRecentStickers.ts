import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { RECENT_STICKERS_MAX } from '../constants/stickers';

const STORE_KEY = 'recent-stickers';
const QUERY_KEY = ['recent-stickers'];

// 최근에 붙인 스티커(최근 것이 앞). 스티커 서랍의 "최근" 탭. 기기에 남는다.
export function useRecentStickers() {
  const queryClient = useQueryClient();
  const q = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<string[]> => {
      try {
        const v = JSON.parse((await AsyncStorage.getItem(STORE_KEY)) ?? '[]');
        return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
      } catch {
        return [];
      }
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });
  const push = (sticker: string) => {
    const prev = queryClient.getQueryData<string[]>(QUERY_KEY) ?? [];
    const next = [sticker, ...prev.filter((s) => s !== sticker)].slice(0, RECENT_STICKERS_MAX);
    queryClient.setQueryData(QUERY_KEY, next);
    AsyncStorage.setItem(STORE_KEY, JSON.stringify(next)).catch(() => {});
  };
  return { recent: q.data ?? [], push };
}
