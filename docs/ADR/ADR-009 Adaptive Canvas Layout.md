---
title: Adaptive Canvas Layout
status: active
owner: project
last_review: 2026-06-07
category: adr
related:
  - ADR-008 Map Canvas Architecture
  - ADR-010 Floating Actions Architecture
adr: "009"
date: 2026-06-04
tags:
  - adr
  - architecture
  - ux
  - map-canvas
  - layout
  - adaptive-ui
---

# ADR-009 Adaptive Canvas Layout

Date: 2026-06-04  
Status: Accepted

---

## Context

Map Canvas 방향으로 전환하면서 현재 Couple Map UI가 여전히 전통적인 페이지 구조를 따르고 있음이 확인되었다.

현재 구조:

```text
Page
 ├─ Header
 ├─ Search
 ├─ Map
 └─ Place List
```

이 구조는 사용자가 "지도를 사용하는 경험"보다 "페이지를 탐색하는 경험"을 먼저 느끼게 만든다.

Google Maps, Kakao Map, Naver Map을 비교 분석한 결과 다음 공통점을 확인하였다.

- 지도는 화면의 주인공이다.
    
- 검색창은 지도 위에 Overlay 된다.
    
- 정보 패널은 지도 위에 Overlay 된다.
    
- 지도는 카드가 아니라 Surface다.
    
- 사용자는 페이지가 아니라 지도를 탐색한다고 느낀다.
    

Map Canvas의 핵심 철학은 다음과 같다.

> 모든 행동은 지도 위에서 시작한다.

따라서 Couple Map도 동일한 정보 계층을 따라야 한다.

---

## Options Considered

### Option A

기존 Page 중심 구조 유지

```text
Page
 ├─ Header
 ├─ Search
 ├─ Map
 └─ List
```

장점

- 구현 단순
    
- 기존 구조 유지
    

단점

- Map Canvas 철학과 충돌
    
- 지도보다 페이지가 먼저 보임
    
- 확장 시 UI 복잡도 증가
    
- Canvas 경험 약화
    

---

### Option B

Map Surface 중심 구조 채택

```text
Map
 ├─ Search Overlay
 ├─ Floating Actions
 ├─ Object Overlays
 └─ Bottom Sheet
```

장점

- 지도 중심 경험
    
- Canvas 개념과 정합
    
- 모바일 및 태블릿 확장 용이
    
- 지도 앱 UX와 일관
    

단점

- 레이아웃 재구성 필요
    
- Overlay 계층 관리 필요
    

---

## Decision

Option B를 채택한다.

Couple Map은 앞으로 모든 화면에서 다음 원칙을 따른다.

### Surface First Principle

지도는 화면 내부 컴포넌트가 아니다.

지도 자체가 화면(Surface)이다.

모든 UI는 지도 위에 Overlay 된다.

---

### Information Hierarchy

우선순위는 다음과 같다.

```text
1. Map
2. Canvas Objects
3. Search
4. Actions
5. Metadata
```

Canvas 이름, 보드 정보, 설정 등은 지도보다 우선하지 않는다.

---

### Search Placement

검색 UI는 지도 외부가 아니라 지도 위에 배치한다.

```text
Map
 └─ Search Overlay
```

검색은 향후 Place, Note, Sticker 등 모든 Canvas Object 생성의 진입점이 될 수 있다.

---

### Object List Placement

Place 목록은 유지한다.

하지만 목록은 지도보다 우선하지 않는다.

목록은 Overlay Bottom Sheet 형태로 제공한다.

```text
Map
 └─ Bottom Sheet
```

---

### Floating Actions

도구, 현재 위치, 레이어, 확대/축소 등의 액션은 지도 위 Floating UI로 제공한다.

---

## Mobile Layout

모바일은 Bottom Sheet 중심 구조를 사용한다.

```text
Map
 ├─ Search Overlay
 ├─ Floating Actions
 └─ Bottom Sheet
```

---

## Tablet Layout

태블릿은 Split View 중심 구조를 사용한다.

```text
┌──────────────────────┬──────────────┐
│                      │              │
│                      │   Objects    │
│       Map            │   Notes      │
│                      │   Places     │
│                      │              │
└──────────────────────┴──────────────┘
```

태블릿을 위해 별도 앱을 만들지 않는다.

동일 코드베이스에서 Adaptive Layout을 적용한다.

---

## Rationale

Map Canvas의 핵심 자산은 데이터 모델(Canvas, Place, Note, Sticker, Route)이며 화면 배치가 아니다.

따라서 플랫폼별 앱을 분리하기보다 동일한 데이터 모델 위에서 레이아웃만 적응적으로 변경하는 것이 유지보수성과 확장성 측면에서 유리하다.

또한 지도 앱의 UX 패턴을 따름으로써 사용자가 즉시 익숙함을 느낄 수 있다.

---

## Consequences

좋은 점

- 지도 중심 경험 강화
    
- Canvas 철학과 정합
    
- 모바일/태블릿 확장성 확보
    
- UI 계층 명확화
    
- 향후 Note/Sticker/Drawing 배치 용이
    

나쁜 점

- Overlay 관리 복잡도 증가
    
- 레이아웃 구현 난이도 증가
    

향후 영향

- Phase 2a 이후 레이아웃 리팩토링 기준이 된다.
    
- Phase 2b 도구 팔레트 설계의 기준이 된다.
    
- 태블릿 대응 시 별도 앱 개발 없이 Adaptive Layout을 적용한다.
    
- 미래 Desktop Layout 설계의 기반이 된다.
    

---

## Related Documents

- [[ADR-008 Map Canvas Architecture]]
    
- [[MAP CANVAS.md]]
    
- [[ARCHITECTURE.md]]