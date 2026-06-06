---
title: Floating Actions Architecture
status: active
owner: project
last_review: 2026-06-07
category: adr
related:
  - ADR-008 Map Canvas Architecture
  - ADR-009 Adaptive Canvas Layout
adr: "010"
date: 2026-06-06
tags:
  - adr
  - architecture
  - ux
  - map-canvas
  - floating-actions
  - adaptive-ui
---

# ADR-010 Floating Actions Architecture

Date: 2026-06-06
Status: Accepted

---

## Context

Map Canvas 전환(ADR-008) 및 Surface First 레이아웃(ADR-009) 이후, 지도 위에 떠 있는 액션 버튼이 늘어날 예정이다.

향후 추가 예정 액션:

- 목록 (List)
- 현재 위치 (Recenter)
- Place 추가
- Note
- Sticker
- Tool Palette

초기 구현에서는 이들을 단일 "FAB" 개념으로 다루었으나, 다음 문제가 확인되었다.

- 액션을 하나의 층으로 취급하면 지도 위가 버튼으로 도배되어 Surface First 원칙이 무너진다.
- 보조 액션(목록/현재 위치)과 생성 액션(Place/Note/Sticker)이 동일 위계로 보여 정보 계층이 흐려진다.
- 생성 액션을 개별 버튼으로 나열하면 ADR-008의 CanvasObject 일반화(생성의 단일 진입)와 충돌한다.

전제:

- Couple Map은 지도앱 클론이 아니라 Map Canvas 제품이다.
- 모든 행동은 지도 위에서 시작한다.
- ADR-008 / ADR-009 / MAP CANVAS.md 를 판단 기준으로 한다.

---

## Decision

Floating Actions를 **3개 영역(Zone)** 으로 분리한다.

### Zone 분류

| Zone | 성격 | 포함 액션 | 위계 |
| --- | --- | --- | --- |
| Search | 외부 → 캔버스 유입 | 검색 | 상단 고정 |
| Utility | 지도를 보는 행위 | Recenter, 목록, (줌) | 보조(중립) |
| Creation | 캔버스에 오브젝트 배치 | Tool Palette(Place/Note/Sticker) | 주(主) |

### 핵심 결정

- 생성 액션(Place/Note/Sticker)은 **개별 FAB로 나열하지 않고 단일 Tool Palette**로 묶는다. (ADR-008 CanvasObject 일반화 정합, MAP CANVAS §4: 도구 선택 → 더블탭 배치)
- 화면에서 강조(주) 액션은 **항상 1개**(생성 진입)로 제한한다.
- Utility는 중립 스타일, Creation은 강조 스타일로 위계를 시각 분리한다.
- Palette / Sheet 등 확장 UI는 평소 접힘(on-demand) → 지도 노출 최대.
- 화면 중앙은 항상 비운다(지도). 액션은 가장자리에만 배치한다.

### Recenter Action (추상화)

"현재 위치" 버튼은 구체 기능명이 아니라 **Recenter Action** 으로 추상화한다.

- 의미: "지도 시점을 의미 있는 기준으로 되돌린다."
- 기본 동작: 현재 위치로 이동(위치 권한 확보 시).
- 폴백/확장: 위치 권한이 없거나 미지원이면 캔버스 오브젝트 fitBounds(전체 보기)로 동작 가능.
- 즉 Recenter는 "현재 위치 + 전체 보기"를 포괄하는 Utility 액션으로 정의한다.

---

## Principles

1. 단일 주(主) 액션 원칙 — 강조 액션은 화면에 1개(생성 진입).
2. 색 의미 고정 — 지도 의미색(핀/동선)과 생성 강조색은 디자인 토큰으로 관리(아래 Tokens).
3. On-demand 확장 — Palette/Sheet는 접힘 기본.
4. 영역 분리 — Utility / Creation / Search 가 공간적으로 겹치지 않음.
5. Surface 보호 — 중앙은 지도, 액션은 가장자리.

---

## Mobile Layout

```text
┌──────────────────────────────┐
│ ‹ [🔍 검색 .............]      │  Search (상단 고정)
│            지도 Surface        │  중앙 비움
│         ① ②  핀 + 동선          │
│                       ┌───┐  │  Utility 스택(우하단, 중립)
│                       │ ◎ │  │   Recenter
│                       ├───┤  │
│                       │☰ N│  │   목록
│                       └───┘  │
│            ┌───┐              │  Creation(하단 중앙, 강조)
│            │ + │ → Palette    │   탭 → Tool Palette
│            └───┘              │
└──────────────────────────────┘
```

- Utility 스택: 우하단, 아래→위 빈도순(목록 최하단, Recenter 위). 중립 스타일.
- Creation: 하단 중앙, 강조 스타일. 탭 → Tool Palette(Place/Note/Sticker) 펼침 → 도구 선택 → 더블탭 배치 모드.
- Sheet(목록 Half Sheet) 열림 시: 하단을 점유하므로 Utility 스택·Creation을 **숨긴다**(시트 내부 CTA 존재). 시트 닫으면 복귀. (지도 상단은 계속 조작 가능 — Surface First / backdrop 미사용 정합)

---

## Tablet Layout (ADR-009 Split)

```text
┌───────────────────────────┬───────────────┐
│        지도 Surface         │  Side Panel    │
│      ① ②  핀 + 동선          │  목록(상시)     │
│                    ┌───┐   │  (후속: 인스펙터)│
│                    │ ◎ │   │               │
│                    └───┘   │               │
│         ┌───┐              │               │
│         │ + │ → Palette    │               │
│         └───┘              │               │
└───────────────────────────┴───────────────┘
```

- 목록 Utility 제거: Side Panel이 목록을 상시 표시하므로 목록 버튼 불필요.
- Recenter: 지도 영역(좌) 우하단 floating 유지.
- Creation/Palette: 지도 영역 하단 중앙 유지(배치 행위는 지도에서 발생). 생성 결과는 Side Panel에 반영.
- 동일 액션 모델, 레이아웃만 분기(별도 앱 금지, ADR-009).

---

## Design Tokens

색상은 하드코딩 hex가 아니라 디자인 토큰 수준으로만 명시한다(구현은 theme 토큰 참조).

| 요소 | 배경 토큰 | 텍스트/아이콘 토큰 | 크기 | 그림자 |
| --- | --- | --- | --- | --- |
| Utility (Recenter/목록) | `surface` + `border` | `textStrong` | 보조 크기(예: 44) | 약 |
| Creation (+) | `primary` (강조 토큰) | `surface` | 주 크기(예: 56) | 중 |
| Tool 칩(Place/Note/Sticker) | `surface` + `border`, 선택 시 `primary` 테두리 | `textStrong` | 보조 크기 | 약 |
| 핀 / 동선 | `primary` (지도 의미색) | `surface` | — | — |

- `primary`(코랄)는 **지도 의미(핀/동선) + 단일 생성 액션**에만 사용한다.
- Utility는 `primary`를 사용하지 않는다(중립 유지).
- 수치(44/56/간격/elevation)는 구현 단계의 theme 토큰으로 확정하며, 본 문서는 위계 관계만 규정한다.

---

## Gesture / Conflict Rules

- 더블탭 = 도구 배치 전용(배치 모드일 때만). 일반 모드 더블탭(줌)과의 충돌은 모드 게이팅으로 회피(MAP CANVAS §6).
- 줌: 모바일은 핀치 우선. ± 버튼은 태블릿/데스크톱 후속(선택).
- 하단 중앙 Creation ↔ Android 제스처 내비: SafeArea + offset.
- Utility 스택 ↔ Kakao 지도 우하단 컨트롤/로고: 겹침 점검.

---

## Consequences

좋은 점

- 정보 위계 명확화(Search > Utility > Creation 의 시각 분리).
- 생성의 단일 진입(Tool Palette)으로 ADR-008 일반화와 정합.
- 지도 노출 최대(중앙 비움 + on-demand 확장).
- 모바일/태블릿 동일 모델, 레이아웃만 분기.

나쁜 점

- Zone/Palette 상태 관리 복잡도 증가.
- 강조색(primary) 중복 인지 가능(핀 vs Creation) → 위치/크기로 구분 필요.
- 더블탭 모드 게이팅 등 제스처 처리 부담(Phase 2b).

향후 영향

- 기존 목록 FAB는 Utility 스택의 한 칸으로 자연 승격(추가 코드 불필요).
- Phase 2b에서 Creation FAB + Tool Palette + 더블탭 배치 모드 도입.
- Recenter는 위치 권한 도입 시 구체화(현재 위치) 가능.

---

## Future Considerations

- **Object Inspector Layer**: 캔버스 오브젝트(Place/Note/Sticker) 선택 시 상세/편집을 제공하는 별도 레이어.
  - 모바일: 오브젝트 탭 → 하단 인스펙터 시트(목록 Sheet와 구분되는 단일 오브젝트 뷰).
  - 태블릿: Side Panel 내 인스펙터 영역(목록 + 선택 오브젝트 상세).
  - Floating Actions와의 관계: 인스펙터는 "선택 컨텍스트" 액션(편집/삭제/이동)을 담으며, 전역 Floating Actions(생성/Utility)와 위계를 분리한다.
- 카테고리 필터(검색 결과 필터, MAP CANVAS §4) — 상단 Search 영역 확장.
- 줌 ± 컨트롤(태블릿/데스크톱).
- Desktop Layout에서의 Floating Actions ↔ 사이드/툴바 통합.
- Realtime 협업 시 타 사용자 액션/커서 표시 레이어.

---

## Related Documents

- [[ADR-008 Map Canvas Architecture]]
- [[ADR-009 Adaptive Canvas Layout]]
- [[MAP CANVAS]]
