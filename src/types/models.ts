// DATABASE.md 의 테이블 정의를 따른다. (Auth/Couple 범위만 정의)

export interface UserProfile {
  id: string;
  nickname: string;
  profile_image: string | null;
  created_at: string;
  updated_at: string;
}

// 'solo' = 1인 워크스페이스, 'active' = 2인 커플, 'ended' = 관계 종료 (DATABASE.md)
export type CoupleStatus = 'solo' | 'active' | 'ended';

export interface Couple {
  id: string;
  user_a_id: string;
  user_b_id: string | null; // 솔로 워크스페이스에서는 null
  status: CoupleStatus;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

export type PlaceProvider = 'naver' | 'manual';

export interface Place {
  id: string;
  board_id: string;
  name: string;
  latitude: number;
  longitude: number;
  provider: PlaceProvider | null;
  provider_place_id: string | null;
  order_index: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// 검색 결과(저장 전). place-search Edge Function 의 정규화 출력과 일치.
export interface PlaceSearchResult {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  provider: PlaceProvider;
  providerPlaceId: string | null;
}

export interface Board {
  id: string;
  couple_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface CoupleInvite {
  id: string;
  invite_token: string;
  created_by: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
  updated_at: string;
}
