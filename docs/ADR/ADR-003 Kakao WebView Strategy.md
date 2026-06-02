# ADR-003 Kakao WebView Strategy

Date: 2026-06-03

Status: Accepted

---

## Context

네이티브 카카오 지도 검증 중
기능 부족 확인.

---

## Problem

@react-native-kakao/map

확인 결과:

- 마커 부족
- 폴리라인 부족
- 커스텀 오버레이 부족

---

## Decision

WebView 사용

---

## Validation

성공:

- SDK 로드
- 지도 렌더
- 마커
- 폴리라인
- RN 통신

---

## Consequences

지도 기능 확장 가능.