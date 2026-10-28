import { createContext, useContext } from 'react';

import type { MapObject, Place, PlaceMemo, PlaceReaction } from '../types/models';

// 보드 단위로 지도에 주입할 데이터(렌더 표면 입력). BoardDetail이 fetch해 전달한다.
export interface MapBoardData {
  places: Place[];
  reactions: PlaceReaction[];
  memos: PlaceMemo[];
  objects: MapObject[];
}

// 펜으로 그린 한 획: 단순화된 지도 좌표 [lng, lat][], 그린 줌(소수), 그린 줌에서의 굵기(px).
export interface DrawStroke {
  points: [number, number][];
  zoom: number;
  width: number;
}

// WebView 메시지가 현재 포커스된 보드로 라우팅될 콜백 집합.
export interface MapCallbacks {
  onMarkerPress?: (id: string) => void;
  onMapPress?: (point?: { lat: number; lng: number; level: number }) => void;
  onObjectPress?: (id: string) => void;
  onObjectMove?: (id: string, lat: number, lng: number) => void;
  onDrawEnd?: (stroke: DrawStroke) => void;
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
  // 카메라 재정렬(0/1/2+ 단일 로직). 고정(focus)도 해제한다.
  recenter(): void;
  // 카메라를 좌표에 고정(알림 탭 진입, 토큰 일치 시에만). 사용자가 지도를 움직이면 풀린다.
  focus(boardId: string, lat: number, lng: number): void;
  // 펜 모드(토큰 일치 시에만): 켜면 지도 이동·확대가 잠기고 손가락이 선을 그린다.
  setPenMode(boardId: string, on: boolean): void;
  // 지금 지도 가운데(마지막으로 보고된 카메라)와 보고 시각(ms). 핀 확정 모드에서 가운데 핀 자리로 쓴다.
  getCenter(): { lat: number; lng: number; at: number } | null;
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
