// RootNavigator 라우트 파라미터 정의

import type { PlacingDraft } from '../utils/placeDraft';

// 보드 진입 시 카메라를 맞출 대상(알림 탭 등). 장소면 placeId, 스티커처럼 장소가 없으면 좌표.
// nonce 가 바뀔 때마다 1회 적용된다.
export interface BoardFocus {
  placeId?: string;
  lat?: number;
  lng?: number;
  nonce: number;
}

// 태블릿 장소 찾기(PlaceAdd)에서 지도로 돌아올 때 넘기는 핀 초안(utils/placeDraft).
// nonce 가 바뀔 때마다 1회 핀 확정 모드를 연다.
export interface PlaceDraftParam extends PlacingDraft {
  nonce: number;
}

export type RootStackParamList = {
  // unauthenticated
  Login: undefined;
  Signup: undefined;
  // no_profile(이메일 가입만)
  ProfileSetup: undefined;
  // 초대 보내기·받기 (solo)
  InviteCreate: undefined;
  InviteJoin: { token?: string } | undefined;
  // 계정·연결 설정 (no_profile | solo | active)
  Settings: undefined;
  // 워크스페이스 보유 (solo | active)
  BoardList: undefined;
  // boardId 가 있으면 이름 바꾸기
  CreateBoard: { boardId: string; title: string } | undefined;
  BoardDetail: { boardId: string; title: string; focus?: BoardFocus; draft?: PlaceDraftParam };
  PlaceAdd: { boardId: string; title: string };
};
