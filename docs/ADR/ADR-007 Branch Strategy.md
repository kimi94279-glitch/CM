---

type: adr  
adr: 007  
title: Branch Strategy  
status: accepted  
created: 2026-06-03  
updated: 2026-06-03  
tags:

- adr
    
- git
    
- workflow
    
- collaboration
    

---

# ADR-007 Branch Strategy

Date: 2026-06-03  
Status: Accepted

---

## Context

프로젝트 진행 중 문서와 코드가 서로 다른 브랜치에 존재하는 문제가 발생했다.

- `main` 브랜치에는 Product Vision, ADR, Architecture 등 프로젝트 문서가 존재했다.
    
- `spike/kakao-map` 브랜치에는 실제 동작하는 앱 코드가 존재했다.
    
- 장소 검색 기능 수정 과정에서 브랜치 전환이 발생했고, 문서가 사라진 것처럼 보이는 문제가 발생했다.
    
- 실제로는 문서가 삭제된 것이 아니라 브랜치가 분리되어 관리되고 있었다.
    

이 구조는 향후 프로젝트 규모가 커질수록 문서 유실, 중복 작업, 잘못된 의사결정의 위험을 증가시킨다.

---

## Options Considered

### Option A

문서 브랜치와 코드 브랜치를 계속 분리 운영

장점

- 실험용 코드와 문서를 독립적으로 관리 가능
    
- 작업 충돌 감소
    

단점

- 문서와 코드의 불일치 발생
    
- 브랜치 관리 복잡도 증가
    
- 문서 유실로 오인할 가능성 증가
    
- 협업 시 혼란 발생
    

### Option B

단일 Main 브랜치 중심 운영

장점

- 문서와 코드를 동일한 기준으로 관리
    
- 프로젝트 상태 파악 용이
    
- 협업 단순화
    
- ADR과 실제 구현의 일치 유지
    

단점

- 실험 작업 시 별도 브랜치 관리 필요
    

---

## Decision

프로젝트의 공식 기준 브랜치는 `main`으로 통일한다.

- Product Vision
    
- ADR
    
- Architecture
    
- MVP 문서
    
- 실제 앱 코드
    

모두 `main` 브랜치에 유지한다.

기능 개발 시에는 임시 작업 브랜치를 생성하되, 완료 후 반드시 `main`으로 병합한다.

---

## Rationale

Couple Map은 현재 소규모 프로젝트이며 개발자 수가 적다.

브랜치를 과도하게 분리하는 것보다 문서와 코드를 동일한 기준 브랜치에서 관리하는 것이 유지보수 비용을 줄이고 프로젝트의 일관성을 유지하는 데 유리하다.

특히 ADR은 구현 코드와 함께 관리되어야 실제 의사결정 기록으로서 의미가 있다.

---

## Consequences

좋은 점

- 문서와 코드의 정합성 확보
    
- 프로젝트 구조 단순화
    
- 협업 비용 감소
    
- 문서 유실 위험 감소
    

나쁜 점

- 실험 기능 개발 시 별도 브랜치 생성 필요
    
- 병합 규칙 준수 필요
    

향후 영향

- 모든 ADR은 `main` 기준으로 작성
    
- Obsidian 문서와 Git 저장소를 동일 기준으로 관리
    
- 기능 개발 후 반드시 `main` 병합 수행
    

---

## Related Documents

- ADR-005 Product Scope Expansion
    
- ADR-006 Search Provider Consolidation
    
- Architecture
    
- Development Log