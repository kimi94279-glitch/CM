---
type: adr
adr: 001
title: Map Provider Selection
status: accepted
created: 2026-06-03
updated: 2026-06-03
tags:
  - adr
  - architecture
  - map
  - kakao
---
# ADR-001 Map Provider Selection

Date: 2026-06-03

Status: Accepted

---

## Context

Couple Map은 장소를 지도 위에 표시하고,  
코스를 연결해야 한다.

필수 요구사항:

- 마커
    
- 폴리라인
    
- 커스텀 오버레이
    
- React Native 연동
    

---

## Options Considered

### Option A: Naver Map

장점

- React Native 라이브러리 성숙
    
- 유지보수 활발
    

단점

- 검색 API와 지도 플랫폼 분리
    
- NCP 의존
    

### Option B: Kakao Native SDK

장점

- 카카오 생태계 활용 가능
    

단점

- RN 라이브러리 기능 부족
    
- 마커 및 폴리라인 지원 한계
    

### Option C: Kakao JS SDK + WebView

장점

- 마커 지원
    
- 폴리라인 지원
    
- 커스텀 오버레이 지원
    
- 카카오 지도 기능 대부분 사용 가능
    

단점

- WebView 의존
    
- JS SDK 의존
    

---

## Decision

Kakao JS SDK + WebView를 채택한다.

---

## Rationale

제품 요구사항을 가장 완전하게 충족하는 유일한 선택지였다.

---

## Consequences

### Positive

- 마커 구현 가능
    
- 폴리라인 구현 가능
    
- 확장성 확보
    

### Negative

- WebView 유지 필요
    
- JS SDK 변경에 영향 받음