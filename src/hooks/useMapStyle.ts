import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { DEFAULT_MAP_STYLE, isMapStyleName, type MapStyleName } from '../components/mapStyles';

const STORE_KEY = 'map-style';
const QUERY_KEY = ['map-style'];

// 이 기기의 기본 지도 바탕(설정 "새 지도 기본 바탕"). 지도마다 고른 바탕(boards.map_style)이 있으면 그게 먼저다(MapHost).
// 계정과 무관하게 기기에 남는다.
export function useMapStyle(): MapStyleName {
  const q = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<MapStyleName> => {
      const v = await AsyncStorage.getItem(STORE_KEY);
      return isMapStyleName(v) ? v : DEFAULT_MAP_STYLE;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });
  return q.data ?? DEFAULT_MAP_STYLE;
}

// 바로 바꾸고(지도가 즉시 다시 그림) 기기에 저장한다.
export function useSetMapStyle() {
  const queryClient = useQueryClient();
  return (name: MapStyleName) => {
    queryClient.setQueryData(QUERY_KEY, name);
    AsyncStorage.setItem(STORE_KEY, name).catch(() => {});
  };
}
