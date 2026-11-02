import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const STORE_KEY = 'seen-hints';
const QUERY_KEY = ['seen-hints'];

// 한 번 본 안내(도구 설명 등)의 이름 목록. 기능 설명은 처음 쓸 때 한 번만 띄운다(2026-11-01 실기기 의견).
// 계정과 무관하게 기기에 남는다. 불러오기 전(loaded=false)에는 아무 안내도 띄우지 않는다.
export function useSeenHints() {
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
  const seen = q.data ?? [];
  const markSeen = (key: string) => {
    const prev = queryClient.getQueryData<string[]>(QUERY_KEY) ?? [];
    if (prev.includes(key)) return;
    const next = [...prev, key];
    queryClient.setQueryData(QUERY_KEY, next);
    AsyncStorage.setItem(STORE_KEY, JSON.stringify(next)).catch(() => {});
  };
  return { loaded: q.isSuccess, hasSeen: (key: string) => seen.includes(key), markSeen };
}
