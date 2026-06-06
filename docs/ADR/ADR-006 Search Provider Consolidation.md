---
title: Search Provider Consolidation
status: active
owner: project
last_review: 2026-06-07
category: adr
related:
  - ADR-001 Map Provider Selection
  - ADR-004 Search Architecture
adr: "006"
date: 2026-06-03
tags:
  - adr
  - architecture
  - search
  - kakao
---

# ADR-006 Search Provider Consolidation

Date: 2026-06-03

Status: Accepted (미구현 — 코드 미반영, 전환 예정)

> ⚠️ 구현 상태: 이 결정은 채택되었으나 **아직 코드에 반영되지 않았다**. 현재 `supabase/functions/place-search`는 여전히 Naver 지역검색 API를 사용하며, `models.ts`·migration의 `provider`도 `'naver'`이다. 전환 시 Edge Function / 데이터 모델 / migration을 함께 갱신해야 한다.

---

## Context

Couple Map은 지도 표시를 위해 Kakao Map을 사용하고 있었지만, 장소 검색은 Naver Search API를 사용하고 있었다.

구조는 다음과 같았다.

App
→ Supabase Edge Function
→ Naver Local Search API

이 구조는 다음과 같은 문제를 가지고 있었다.

- 지도 공급자와 검색 공급자가 다름
- Naver Client ID / Secret 두 개의 키 관리 필요
- 좌표 변환(mapx/mapy ÷ 1e7) 처리 필요
- 공급자 이원화로 유지보수 복잡성 증가
- 검색 결과와 지도 데이터의 일관성 부족

---

## Options Considered

### Option A

Kakao Map + Naver Search 유지

장점

- 기존 구현 유지 가능
- 추가 작업 최소화

단점

- 공급자 이원화
- API Key 관리 복잡
- 좌표 변환 필요
- 유지보수 비용 증가

### Option B

Kakao Map + Kakao Local API 통합

장점

- 단일 공급자 사용
- REST API Key 하나만 관리
- 좌표 변환 불필요
- 유지보수 단순화
- 검색 결과와 지도 데이터 일관성 확보

단점

- Edge Function 수정 필요
- 기존 Naver 검색 로직 제거 필요

---

## Decision

장소 검색 공급자를 Naver Search API에서 Kakao Local API로 전환한다.

최종 구조:

App
→ Supabase Edge Function
→ Kakao Local API

지도와 검색 모두 Kakao 플랫폼을 사용한다.

---

## Rationale

Couple Map의 MVP 목표는 빠른 기능 개발과 안정적인 유지보수다.

검색 공급자를 Kakao로 통합하면:

- API 공급자 수 감소
- 인증 키 관리 단순화
- 좌표 변환 제거
- 검색 결과와 지도 데이터 일관성 확보

가 가능하다.

특히 Kakao Local API는 이미 지도 기능에서 사용하는 플랫폼과 동일하기 때문에 아키텍처 복잡도를 줄일 수 있다.

---

## Consequences

좋은 점

- 단일 공급자 구조
- API Key 관리 단순화
- 유지보수 비용 감소
- 좌표 처리 단순화
- 검색 결과 품질 일관성 확보

나쁜 점

- Naver Search API 의존성 제거 필요
- Edge Function 수정 및 재배포 필요

향후 영향

- 장소 관련 기능은 Kakao 플랫폼 기준으로 확장
- 검색, 지도, 장소 상세 조회를 동일 생태계에서 운영
- 공급자 전환 비용 감소

---

## Related Documents

- ADR-001 Map Provider Selection
- ADR-004 Search Architecture
- ARCHITECTURE.md
- PRD.md
