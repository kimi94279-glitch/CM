---
title: Search Architecture
status: deprecated
owner: project
last_review: 2026-06-07
category: adr
related:
  - ADR-006 Search Provider Consolidation
adr: 004
date: 2026-06-03
tags:
  - adr
  - architecture
  - search
  - edge-function
---
# ADR-004 Search Architecture

Date: 2026-06-03

Status: Deprecated — Superseded by ADR-006 Search Provider Consolidation

> ⚠️ 이 결정(Naver Search API 경유)은 ADR-006에서 Kakao Local API 단일 공급자로 대체되었다. 현재 유효하지 않으며 기록 목적으로만 유지한다.

---

## Context

장소 검색 필요.

API Key를 앱에 노출할 수 없음.

---

## Decision

RN
→ Supabase Edge Function
→ Naver Search API

---

## Rationale

- API Key 보호
- 공급자 교체 용이
- 호출 통제 가능

---

## Current Status

place-search 미배포.

---

## Future

카카오 Local API 통합 여부 검토.