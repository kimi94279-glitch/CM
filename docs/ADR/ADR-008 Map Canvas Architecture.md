---
title: Map Canvas Architecture
status: active
owner: project
last_review: 2026-06-07
category: adr
related:
  - MAP CANVAS.md
  - ADR-005 Product Scope Expansion
  - ADR-009 Adaptive Canvas Layout
adr: "008"
date: 2026-06-04
tags:
  - adr
  - architecture
  - map-canvas
  - product-direction
  - canvas-object
---

# ADR-008 Map Canvas Architecture

Date: 2026-06-04  
Status: Accepted

---

## Context

Couple Map의 제품 방향이 "데이트 장소 저장 앱"에서 **공유 지도 캔버스(Map Canvas)** 로 전환되었다.

핵심 원칙은 다음과 같다.

> 모든 행동은 지도 위에서 시작한다.

사용자는 보드를 먼저 만들고 장소를 추가하는 것이 아니라, 지도를 열고 그 위에 오브젝트(Place, Note, Sticker 등)를 배치한다.

현재 자산:

- boards (워크스페이스 소속 캔버스)
    
- places (좌표 기반 장소 오브젝트)
    
- couples (워크스페이스)
    
- RLS (`is_member_of_couple`)
    
- MapWebView + Kakao JS SDK
    
- 번호 핀(CustomOverlay)
    
- Route 표현(order_index + Polyline)
    

제약 조건:

- boards / places / couples 유지
    
- 기존 RLS 유지
    
- 대규모 리팩토링 금지
    
- places 유지
    
- Drawing 범위 제외
    

---

## Options Considered

### Option A

places와 map_objects를 통합하여 단일 canvas_objects 테이블로 관리

장점

- 단일 데이터 소스
    
- 단순한 렌더링 구조
    
- 단일 쿼리 가능
    

단점

- places 데이터 마이그레이션 필요
    
- 검색 및 번호 핀 기능 회귀 위험
    
- 대규모 리팩토링 발생
    
- 기존 안정화된 구조 훼손 가능성
    

### Option B

places 유지 + map_objects 추가 + CanvasObject Adapter 패턴 사용

장점

- 기존 places 구조 유지
    
- 검색 및 번호 핀 기능 재사용 가능
    
- 데이터 마이그레이션 불필요
    
- 점진적 확장 가능
    
- 회귀 위험 최소
    

단점

- 어댑터 계층 필요
    
- 서비스 레이어에서 타입 분기 발생
    
- 데이터 소스가 두 개 존재
    

---

## Decision

Option B를 채택한다.

구체적으로:

- places는 유지한다.
    
- places는 논리적으로 `CanvasObject(kind='place')` 로 취급한다.
    
- Note / Sticker는 신규 테이블 `map_objects` 에 저장한다.
    
- 클라이언트는 Adapter 패턴을 통해 places + map_objects 를 `CanvasObject[]` 로 통합한다.
    
- Route는 기존 `places.order_index + Polyline` 을 사용한다.
    
- Drawing은 현재 범위에서 제외한다.
    

예상 구조:

```ts
type CanvasObjectKind =
  | "place"
  | "note"
  | "sticker";

interface CanvasObject {
  id: string;
  boardId: string;
  kind: CanvasObjectKind;

  latitude: number;
  longitude: number;
}
```

---

## Rationale

현재 프로젝트는 이미 places 기반의 지도 오브젝트 구조를 보유하고 있다.

places를 제거하거나 통합하는 것은 얻는 이점보다 위험이 크다.

CanvasObject Adapter 패턴을 사용하면:

- 기존 Place 기능을 유지할 수 있고
    
- Note / Sticker를 자연스럽게 추가할 수 있으며
    
- 향후 Drawing, Route 확장도 가능하다.
    

또한 물리적 테이블 통합 없이 논리적 통합만 수행하므로 점진적 개발이 가능하다.

---

## Consequences

좋은 점

- DB 변경 최소화
    
- 기존 기능 재사용 가능
    
- 회귀 위험 감소
    
- Canvas 중심 UI 전환 가능
    
- 확장성 확보
    

나쁜 점

- Adapter 계층 추가
    
- 데이터 소스가 분리됨
    
- 서비스 레이어 복잡도 소폭 증가
    

향후 영향

- map_objects 기반 Note / Sticker 확장 가능
    
- Drawing 기능 추가 가능
    
- Realtime 협업 기능 추가 가능
    
- Route 명시화 시 가산적 마이그레이션 가능
    
- 현재 위치 중심 진입 UX 도입 가능
    

---

## Related Documents

- MAP CANVAS.md
- ADR-001 Map Provider Selection
- ADR-003 Kakao WebView Strategy
- ADR-005 Product Scope Expansion
- DATABASE.md
