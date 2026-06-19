import { createContext, useContext } from 'react';

import type { MapObject, Place, PlaceReaction } from '../types/models';

// 보드 단위로 지도에 주입할 데이터(렌더 표면 입력). BoardDetail이 fetch해 전달한다.
export interface MapBoardData {
  places: Place[];
  reactions: PlaceReaction[];
  objects: MapObject[];
}

// WebView 메시지가 현재 포커스된 보드로 라우팅될 콜백 집합.
export interface MapCallbacks {
  onMarkerPress?: (id: string) => void;
  onMapPress?: (point?: { lat: number; lng: number; level: number }) => void;
  onObjectPress?: (id: string) => void;
  onObjectMove?: (id: string, lat: number, lng: number) => void;
}

// 싱글톤 지도(MapHost)를 제어하는 명령형 컨트롤러.
// 모든 보드 종속 호출은 boardId를 받아, 현재 보드 토큰과 다르면 무시한다(잔상/늦은 응답 차단).
export interface MapHostController {
  // 보드 전환 시작: 토큰 설정 + 이전 보드 오버레이/콜백/선택 clear.
  beginBoard(boardId: string): void;
  // 보드 데이터 주입(토큰 일치 시에만 반영).
  setData(boardId: string, data: MapBoardData): void;
  // 편집 선택 갱신(토큰 일치 시에만).
  setSelectedObjectId(boardId: string, id: string | null): void;
  // 현재 보드의 WebView 메시지 콜백 등록(토큰 일치 시에만).
  setCallbacks(boardId: string, cb: MapCallbacks): void;
  // 카메라 재정렬(0/1/2+ 단일 로직).
  recenter(): void;
  // 지도 표시/숨김(포커스 전환 시).
  show(): void;
  hide(): void;
}

const MapHostContext = createContext<MapHostController | null>(null);

export const MapHostProvider = MapHostContext.Provider;

// MapHost 하위에서만 사용. 컨트롤러로 지도를 명령형 제어한다.
export function useMapHost(): MapHostController {
  const c = useContext(MapHostContext);
  if (!c) throw new Error('useMapHost must be used within <MapHost>');
  return c;
}
