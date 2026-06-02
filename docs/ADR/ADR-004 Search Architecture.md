# ADR-004 Search Architecture

Date: 2026-06-03

Status: Accepted

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