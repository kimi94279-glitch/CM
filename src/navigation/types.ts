// RootNavigator 라우트 파라미터 정의

// 보드 진입 시 카메라를 맞출 대상(알림 탭 등). 장소면 placeId, 스티커처럼 장소가 없으면 좌표.
// nonce 가 바뀔 때마다 1회 적용된다.
export interface BoardFocus {
  placeId?: string;
  lat?: number;
  lng?: number;
  nonce: number;
}

export type RootStackParamList = {
  // unauthenticated
  Login: undefined;
  Signup: undefined;
  // no_profile
  ProfileSetup: undefined;
  // no_couple
  CoupleConnect: undefined;
  InviteCreate: undefined;
  InviteJoin: { token?: string } | undefined;
  // 워크스페이스 보유 (solo | active)
  BoardList: undefined;
  CreateBoard: undefined;
  BoardDetail: { boardId: string; title: string; focus?: BoardFocus };
  PlaceAdd: { boardId: string };
};
