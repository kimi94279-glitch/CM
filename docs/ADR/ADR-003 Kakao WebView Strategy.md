---
type: adr
adr: 003
title: Kakao WebView Strategy
status: accepted
created: 2026-06-03
updated: 2026-06-03
tags:
  - adr
  - frontend
  - kakao
  - webview
---
# ADR-003 Kakao WebView Strategy

Date: 2026-06-03

Status: Accepted

---

## Context

카카오 지도를 React Native에서 사용해야 한다.

초기에는 네이티브 SDK 사용을 검토했다.

---

## Options Considered

### Option A: react-native-kakao-map

장점

- 네이티브 렌더링
    

단점

- 기능 부족
    
- 마커/폴리라인 지원 한계
    

### Option B: Kakao JS SDK + WebView

장점

- 기능 완전성
    
- 공식 JS SDK 활용
    
- 마커/폴리라인 지원
    

단점

- WebView 의존
    

---

## Decision

Kakao JS SDK + WebView를 사용한다.

---

## Rationale

스파이크 결과:

- SDK 로드 성공
    
- 지도 렌더 성공
    
- 마커 성공
    
- 폴리라인 성공
    
- RN ↔ WebView 통신 성공
    

제품 요구사항을 충족함을 검증했다.

---

## Consequences

### Positive

- 제품 요구사항 충족
    
- 확장 가능
    

### Negative

- WebView 유지 필요
    
- 네이티브 지도 대비 성능 오버헤드 존재