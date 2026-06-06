---
title: Couple Map
status: active
owner: project
last_review: 2026-06-07
category: overview
related:
  - PRD.md
  - ARCHITECTURE.md
---
# Couple Map

커플이 함께 데이트 장소를 모으고, 지도로 연결하며, 데이트 코스를 계획하는 협업 지도 앱.
이동 경로보다 **"함께 계획을 만드는 과정"**에 집중한다. (자세한 배경은 [PRD](PRD.md) 참고)

## 빠른 시작

1. 의존성 설치: `npm install`
2. 환경 변수 설정: `.env.example`을 `.env`로 복사 후 채운다.
   - `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_KAKAO_JS_KEY`
3. Supabase 프로비저닝 및 Auth 런타임 검증: [SUPABASE_SETUP.md](SUPABASE_SETUP.md) 절차 수행
4. 앱 실행: `npx expo start` (Dev Build)

## Tech Stack

- Expo / React Native (New Architecture)
- Supabase (Auth · Database · Edge Functions)
- 지도: Kakao Maps JavaScript SDK (WebView)
- 검색: Naver 지역검색 API (Edge Function `place-search`) — Kakao 통합은 [ADR-006](docs/ADR/ADR-006%20Search%20Provider%20Consolidation.md) 결정·미구현

## 핵심 문서

- [PRD.md](PRD.md) — 제품 요구사항 · 비전 · MVP 범위
- [ARCHITECTURE.md](ARCHITECTURE.md) — 기술 구조 · 설계 원칙
- [DATABASE.md](DATABASE.md) — 데이터베이스 설계
- [DESIGN.md](DESIGN.md) — 시각/경험 디자인 기준
- [FLOW_AUTH.md](FLOW_AUTH.md) — 인증 · 커플 연결 흐름
- [UX_AUTH.md](UX_AUTH.md) · [UX_BOARD.md](UX_BOARD.md) — 화면 UX/UI 설계
- [HARNESS.md](HARNESS.md) — 개발 절차 · 작업 규칙
- [docs/MAP CANVAS.md](docs/MAP%20CANVAS.md) — Map Canvas 아키텍처
- 아카이브(과거 기록): [docs/archive/](docs/archive)

## ADR (아키텍처 결정 기록)

`docs/ADR/`에 위치. 주요 항목:

- [ADR-001 Map Provider Selection](docs/ADR/ADR-001%20Map%20Provider%20Selection.md)
- [ADR-002 Supabase Adoption](docs/ADR/ADR-002%20Supabase%20Adoption.md)
- [ADR-003 Kakao WebView Strategy](docs/ADR/ADR-003%20Kakao%20WebView%20Strategy.md)
- [ADR-005 Product Scope Expansion](docs/ADR/ADR-005%20Product%20Scope%20Expansion.md)
- [ADR-006 Search Provider Consolidation](docs/ADR/ADR-006%20Search%20Provider%20Consolidation.md) — Accepted(미구현)
- [ADR-007 Branch Strategy](docs/ADR/ADR-007%20Branch%20Strategy.md)
- [ADR-008 Map Canvas Architecture](docs/ADR/ADR-008%20Map%20Canvas%20Architecture.md)
- [ADR-009 Adaptive Canvas Layout](docs/ADR/ADR-009%20Adaptive%20Canvas%20Layout.md)
- [ADR-010 Floating Actions Architecture](docs/ADR/ADR-010%20Floating%20Actions%20Architecture.md)
- [ADR-011 Half Sheet Dismiss UX](docs/ADR/ADR-011%20Half%20Sheet%20Dismiss%20UX.md)
- [ADR-012 Recenter Action](docs/ADR/ADR-012%20Recenter%20Action.md)
- ADR-004(Search Architecture)는 ADR-006으로 대체됨(deprecated).

## 현재 개발 상태

MVP 단계. 인증 · 보드 · 장소 추가/목록 · 지도(마커/폴리라인/fitBounds/Recenter)는 구현 완료(정적 검증), 일부 런타임 검증 대기.
미착수: 장소 메모 · 커플 초대 공유 · 반응 · 실시간 동기화. 상세는 [TASK.md](TASK.md) · [docs/Feature List.md](docs/Feature%20List.md) 참고.
