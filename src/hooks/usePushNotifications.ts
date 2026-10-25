import type { NavigationContainerRefWithCurrent } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import type { RootStackParamList } from '../navigation/types';
import { registerPushToken } from '../services/pushService';
import { useAuth } from './useAuthState';

// 앱이 켜져 있을 때 도착한 상대 소식도 배너로 보여준다(소리·배지 없음).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// 권한 요청 → Expo 푸시 토큰 → 내 계정에 등록.
// Android: FCM 설정(google-services.json + EAS 의 FCM V1 키)이 없으면 토큰 발급이 실패한다.
// iOS: APNs 키(EAS 자격 증명)가 있어야 실제로 도착한다. 둘 다 개발 빌드가 필요하다(Expo Go 불가).
async function registerForPush(): Promise<void> {
  if (Platform.OS === 'android') {
    // Android 13+: 채널이 하나 있어야 권한 요청 창이 뜬다 → 토큰 요청 전에 만든다.
    await Notifications.setNotificationChannelAsync('default', {
      name: '상대 소식',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  const granted = current.granted || (await Notifications.requestPermissionsAsync()).granted;
  if (!granted) return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) throw new Error('EAS projectId 가 없습니다(app.json extra.eas.projectId).');
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  await registerPushToken(token, Platform.OS === 'ios' ? 'ios' : 'android');
}

// 커플이 연결된(active) 계정에서만 알림 권한을 묻고 토큰을 등록한다 — 상대가 있어야 알림이 의미 있다.
// 계정당 앱 실행 1회. 실패하면 다음 상태 변화(재로그인 등) 때 다시 시도한다.
export function usePushRegistration() {
  const { status, session } = useAuth();
  const userId = session?.user?.id ?? null;
  const registeredFor = useRef<string | null>(null);

  useEffect(() => {
    if (status !== 'active' || !userId || registeredFor.current === userId) return;
    registeredFor.current = userId;
    registerForPush().catch((e) => {
      registeredFor.current = null;
      console.warn('[push] 알림 등록 실패', e);
    });
  }, [status, userId]);
}

// 앱이 켜져 있을 때 상대 소식이 오면 그 보드 데이터를 다시 받아 지도에 바로 반영한다(실시간 대용).
// 보드 데이터 쿼리 키는 모두 [종류, boardId] 형태(usePlaces/usePlaceReactions/usePlaceMemos/useMapObjects).
export function usePushRefresh() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener((notification) => {
      const boardId = notification.request.content.data?.boardId;
      if (typeof boardId !== 'string') return;
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[1] === boardId });
    });
    return () => sub.remove();
  }, [queryClient]);
}

// 알림 data(0006 notify_partner: boardId/boardTitle/placeId/lat/lng) → 보드 상세 파라미터.
function toBoardParams(
  data: Record<string, unknown> | undefined
): RootStackParamList['BoardDetail'] | null {
  if (!data || typeof data.boardId !== 'string') return null;
  return {
    boardId: data.boardId,
    title: typeof data.boardTitle === 'string' ? data.boardTitle : '',
    focus: {
      placeId: typeof data.placeId === 'string' ? data.placeId : undefined,
      lat: typeof data.lat === 'number' ? data.lat : undefined,
      lng: typeof data.lng === 'number' ? data.lng : undefined,
      nonce: Date.now(),
    },
  };
}

// 알림 탭(앱 종료 상태에서 연 경우 포함) → 그 보드로 이동해 핀/스티커 위치에 카메라를 맞춘다.
// 네비게이터가 준비되고 워크스페이스가 있는 상태(solo/active)가 될 때까지 기다렸다가 1회 처리한다.
export function usePushNavigation(
  navigationRef: NavigationContainerRefWithCurrent<RootStackParamList>,
  navReady: boolean
) {
  const { status } = useAuth();
  // undefined = 아직 판별 중, null = 탭한 알림 없음.
  const response = Notifications.useLastNotificationResponse();
  const handledId = useRef<string | null>(null);

  useEffect(() => {
    if (!response || !navReady || !navigationRef.isReady()) return;
    if (status !== 'active' && status !== 'solo') return;
    if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const id = response.notification.request.identifier;
    if (handledId.current === id) return;
    handledId.current = id;

    const params = toBoardParams(response.notification.request.content.data);
    if (params) {
      // 스택을 [목록, 상세]로 다시 짠다 — 다른 보드 화면 위에 쌓여 싱글톤 지도가 엇갈리는 것을 막는다.
      navigationRef.reset({
        index: 1,
        routes: [{ name: 'BoardList' }, { name: 'BoardDetail', params }],
      });
    }
    // 다음 실행 때 같은 알림으로 다시 이동하지 않게 비운다.
    Notifications.clearLastNotificationResponseAsync().catch(() => {});
  }, [response, navReady, status, navigationRef]);
}
