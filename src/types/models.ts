// DATABASE.md 의 테이블 정의를 따른다. (Auth/Couple 범위만 정의)

export interface UserProfile {
  id: string;
  nickname: string;
  ink: string; // 내 잉크 이름(theme inks 키, 0012). 모르는 값이면 기본 잉크로 본다.
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

// 장소 출처(ADR-016 하이브리드, 0014·0016): public = 공공데이터(상가정보) 레코드(provider_place_id = 상가업소번호)
// · manual = 사용자가 직접 찍은 핀
// · kakao_live = 카카오 실시간 핀 — 장소 ID·검색어만 저장, 좌표·이름은 볼 때마다 카카오에서(latitude/longitude 는 동네 중심 자리표시)
export type PlaceProvider = 'public' | 'manual' | 'kakao_live';

export interface Place {
  id: string;
  board_id: string;
  name: string;
  latitude: number;
  longitude: number;
  provider: PlaceProvider | null;
  provider_place_id: string | null;
  kakao_place_id: string | null; // 카카오맵 링크용 장소 ID 단독(0014) — 카카오에서 저장하는 건 이것뿐
  live_query: string | null; // 실시간 핀을 다시 찾을 검색어(사용자가 친 글자, 0016)
  order_index: number;
  created_by: string | null; // 탈퇴한 사람이 찍은 장소는 null (0010)
  created_at: string;
  updated_at: string;
}

// 장소 반응(banter). DB place_reactions.reaction_type 와 일치. 이모지는 UI 파생값(미저장).
export type ReactionType = 'love' | 'lol' | 'nope' | 'wow';

export interface PlaceReaction {
  id: string;
  place_id: string;
  user_id: string;
  reaction_type: ReactionType;
  created_at: string;
}

// 장소 한 줄 메모(말풍선). DB place_memos 와 일치. 핀 위 대화 = 장소에 묶인 짧은 텍스트(ADR-014).
export interface PlaceMemo {
  id: string;
  place_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

// 저장 직전의 핀 — 이름·좌표는 공공데이터 레코드 또는 사용자가 정한 값뿐(ADR-016 Option D′).
export interface PlaceDraft {
  name: string;
  latitude: number;
  longitude: number;
  provider: PlaceProvider;
  providerPlaceId: string | null; // public 이면 상가업소번호
  kakaoPlaceId: string | null;
  liveQuery: string | null; // kakao_live 이면 다시 찾을 검색어
}

// 실시간 핀의 지금 모습(place-search resolve) — 화면 표시 전용, 저장하지 않는다.
export interface LivePlace {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

export interface LiveResolveResponse {
  places: Record<string, LivePlace>; // 카카오 장소 ID → 지금 모습
  missing: string[]; // 카카오에서 더는 찾을 수 없음(폐업·이전 등)
  failed: string[]; // 카카오 오류 — 다음에 다시
}

// 검색 결과(카카오) — 화면 표시와 매칭 조회 키 전용(저장하지 않는다). place-search search 출력과 일치.
export interface PlaceSearchResult {
  name: string;
  address: string;
  jibunAddress?: string; // 매칭이 안 될 때 동네를 찾는 조회 키(함수 배포 전 응답엔 없음)
  latitude: number;
  longitude: number;
  provider: 'kakao';
  providerPlaceId: string | null; // 카카오 장소 ID
}

// place-search match 출력 — 고른 카카오 결과에 맞는 공공데이터 레코드(없으면 null)와, 없을 때 옮겨 갈 동네 중심.
export interface PlaceMatch {
  poiId: string;
  name: string;
  branch: string | null;
  category: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
  confidence: 'high' | 'low';
}

export interface PlaceMatchResponse {
  match: PlaceMatch | null;
  dong: { name: string; latitude: number; longitude: number } | null;
}

// Infinite Geographic Canvas 객체(Place 비종속, 좌표 고정). DB map_objects 와 일치.
// zoom_level 은 생성 당시 줌 — world-space 스케일 기준값으로 렌더(객체 크기)에 사용된다.
export type MapObjectType = 'text' | 'sticker' | 'arrow' | 'draw';

export interface MapObject {
  id: string;
  board_id: string;
  type: MapObjectType;
  latitude: number;
  longitude: number;
  zoom_level: number;
  payload: Record<string, unknown>;
  created_by: string | null; // 탈퇴한 사람의 스티커·그림은 null (0010)
  created_at: string;
  updated_at: string;
}

export interface Board {
  id: string;
  couple_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

// 보드별 새 흔적 (board_activity RPC, 0009)
// unread: 내가 마지막으로 본 뒤 상대가 남긴 흔적 수 / lastActivityAt: 마지막 흔적 시각(없으면 null)
export interface BoardActivity {
  unread: number;
  lastActivityAt: string | null;
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
