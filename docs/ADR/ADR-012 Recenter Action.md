---
title: Recenter Action
status: active
owner: project
last_review: 2026-06-07
category: adr
related:
  - ADR-008 Map Canvas Architecture
  - ADR-010 Floating Actions Architecture
adr: "012"
date: 2026-06-06
tags:
  - adr
  - map
  - recenter
  - webview
---
# ADR-012 Recenter Action

## 상태

Accepted

## 목적

사용자가 지도를 이동하거나 확대/축소한 뒤 전체 장소를 다시 한 화면에 볼 수 있도록 한다.

## 결정

모바일 지도 우하단 Utility FAB에 Recenter Action을 추가한다.

동작:

- 장소 0개 → 기본 중심(서울시청) + Level 5
- 장소 1개 → 해당 장소 중심 + Level 4
- 장소 2개 이상 → fitBounds

## 구현

RN → WebView 통신은 injectJavaScript 사용.

- `window.recenter()`를 WebView 내부에 노출 (`src/components/mapWebViewHtml.ts`의 `applyCamera()`)
- `MapWebViewHandle.recenter()` → injectJavaScript → `window.recenter()` (`src/components/MapWebView.tsx`)
- 초기 로드와 Recenter가 동일 `applyCamera()` 0/1/2+ 분기를 공용 사용 (분기 중복 제거)
- 코드와 문서 일치 확인됨 (2026-06-07). 읽기 전용 카메라 명령으로 DB·검색·CRUD 무관 → 회귀 위험 낮음.

## 후속 검토

현재 FAB 아이콘은 임시 상태이다.

실사용 데이터를 확인한 후:

- FAB 유지
    
- 목록 메뉴로 이동
    
- Long Press 제스처로 이동
    

중 하나를 결정한다.