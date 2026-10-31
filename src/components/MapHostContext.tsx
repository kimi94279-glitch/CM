import { createContext, useContext } from 'react';

import type { MapObject, Place, PlaceMemo, PlaceReaction } from '../types/models';
import type { MapStyleName } from './mapStyles';

// 보드 단위로 지도에 주입할 데이터(렌더 표면 입력). BoardDetail이 fetch해 전달한다.
export interface MapBoardData {
  places: Place[];
  reactions: PlaceReaction[];
  memos: PlaceMemo[];
  objects: MapObject[];
}

// 필통의 그리는 도구: 연필(아직 정하지 않은 길) · 잉크(정한 길) · 형광펜(이 동네 좋아) · 실 자(두 점 사이 거리감)
export type DrawTool = 'pencil' | 'ink' | 'marker' | 'string';

export function isDrawTool(v: unknown): v is DrawTool {
  return v === 'pencil' || v === 'ink' || v === 'marker' || v === 'string';
}

// 손으로 그린 한 획: 단순화된 지도 좌표 [lng, lat][], 그린 줌(소수), 그린 줌에서의 굵기(px), 도구.
// 실 자는 두 점(시작·끝)만 온다.
export interface DrawStroke {
  points: [number, number][];
  zoom: number;
  width: number;
  kind: DrawTool;
}

// 지도 한 장으로 접기(내보내기) 옵션 — 카드에 들어갈 글자. names 는 핀 이름(사용자가 붙인 이름만).
export interface ExportCardOptions {
  title: string;
  dateText: string; // "2026년 11월 8일"
  people: { name: string; color: string }[];
  names: Record<string, string>;
  credit: string[];
}

// WebView 메시지가 현재 포커스된 보드로 라우팅될 콜백 집합.
export interface MapCallbacks {
  onMarkerPress?: (id: string) => void;
  onMapPress?: (point?: { lat: number; lng: number; level: number }) => void;
  // 객체 탭. 그린 선을 탭했으면 그 자리(point)도 온다 — 스티커 도구면 선택 대신 그 자리에 붙인다.
  onObjectPress?: (id: string, point?: { lat: number; lng: number; level: number }) => void;
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
  // 든 도구(토큰 일치 시에만, null = 손): 들면 한 손가락은 그리기, 두 손가락은 지도 이동.
  setDrawTool(boardId: string, tool: DrawTool | null): void;
  // 이 보드의 바탕(boards.map_style). null = 기기 기본 바탕(설정).
  setMapStyle(boardId: string, style: MapStyleName | null): void;
  // 지금 화면을 지도 한 장(9:16 jpeg base64)으로 굽는다. 실패하면 null.
  exportCard(options: ExportCardOptions): Promise<string | null>;
  // 방금 꽂은 핀 — 지도에서 '퐁' 떨어지는 연출(토큰 일치 시에만).
  dropPin(boardId: string, placeId: string): void;
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
