# ADR-002 Supabase Adoption

Date: 2026-06-03

Status: Accepted

---

## Context

MVP를 빠르게 출시해야 한다.

필요 기능:

- 인증
    
- 데이터베이스
    
- 파일 저장
    
- 서버리스 함수
    

---

## Options Considered

### Option A: Firebase

장점

- 성숙한 서비스
    

단점

- SQL 기반 모델 부족
    

### Option B: Custom Backend

장점

- 높은 자유도
    

단점

- 개발 비용 증가
    

### Option C: Supabase

장점

- PostgreSQL
    
- Auth
    
- Storage
    
- Edge Functions
    

단점

- Vendor Lock-in 가능성
    

---

## Decision

Supabase를 채택한다.

---

## Rationale

MVP를 가장 빠르게 개발할 수 있으며,  
현재 요구사항을 모두 충족한다.

---

## Consequences

### Positive

- 빠른 개발 가능
    
- 단일 플랫폼 운영
    

### Negative

- Supabase 서비스 의존성 증가