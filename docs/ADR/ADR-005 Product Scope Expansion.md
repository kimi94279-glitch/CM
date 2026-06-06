---
title: Product Scope Expansion
status: active
owner: project
last_review: 2026-06-07
category: adr
related:
  - PRD.md
  - ADR-008 Map Canvas Architecture
adr: "005"
date: 2026-06-03
tags:
  - adr
  - product
  - vision
  - scope
---
# ADR-005 Product Scope Expansion

Date: 2026-06-03

Status: Accepted

---

## Context

초기 Couple Map은 커플이 함께 방문한 장소를 기록하고,  
추억을 저장하는 앱으로 시작했다.

하지만 제품 방향을 구체화하는 과정에서,  
사용자가 가장 즐거움을 느끼는 지점은  
"기록"보다 "함께 계획하는 과정"에 있다는 점을 발견했다.

또한 동일한 문제는 커플뿐 아니라:

- 친구 여행
    
- 가족 여행
    
- 소규모 모임
    

에서도 반복적으로 발생한다.

---

## Options Considered

### Option A: 커플 전용 추억 기록 앱 유지

장점

- 명확한 타겟
    
- 감성적 브랜딩 가능
    

단점

- 사용 시점이 방문 이후에 집중됨
    
- 확장성이 제한됨
    

### Option B: 커플 전용 데이트 계획 앱

장점

- 계획 과정에 집중 가능
    
- 현재 MVP와 일치
    

단점

- 커플 외 사용자를 배제
    

### Option C: 협업 지도 플랫폼으로 확장

장점

- 커플 사용 가능
    
- 친구 사용 가능
    
- 여행 계획에도 적용 가능
    
- 제품 확장성 확보
    

단점

- 포지셔닝이 다소 넓어질 수 있음
    

---

## Decision

제품의 본질을

"커플 앱"

이 아니라

"함께 계획하는 협업 지도"

로 정의한다.

다만 초기 타겟 사용자는  
20~30대 커플로 유지한다.

---

## Rationale

사용자가 얻는 핵심 가치는

장소 저장 자체가 아니라,

함께 지도를 보며 이야기하고,  
계획을 만들어가는 경험에 있다.

따라서 제품은 특정 관계에 종속되지 않고,  
협업 계획 경험을 중심으로 설계한다.

---

## Consequences

### Positive

- 시장 규모 확대 가능
    
- 친구/여행/모임으로 확장 가능
    
- 기능 우선순위가 명확해짐
    

### Negative

- 커플 전용 브랜딩은 약해질 수 있음
    
- 제품 메시지를 더 명확하게 설계해야 함
    

---

## Related Documents

- Product Vision
    
- MVP
    
- Feature List