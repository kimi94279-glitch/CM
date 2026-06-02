# ADR-002 Supabase Adoption

Date: 2026-06-03

Status: Accepted

---

## Context

MVP를 빠르게 출시해야 한다.

필요:

- 인증
- DB
- 파일 저장
- 서버리스 함수

---

## Options Considered

### Firebase

장점

- 성숙

단점

- SQL 부재

---

### Custom Backend

장점

- 자유도

단점

- 개발 비용 증가

---

### Supabase

장점

- PostgreSQL
- Auth
- Storage
- Edge Functions

단점

- Vendor Lock-in

---

## Decision

Supabase 채택

---

## Rationale

MVP 개발 속도가 가장 빠름.

---

## Consequences

Edge Function 의존 증가.