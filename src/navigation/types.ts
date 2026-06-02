// RootNavigator 라우트 파라미터 정의

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
  BoardDetail: { boardId: string; title: string };
  PlaceAdd: { boardId: string };
};
