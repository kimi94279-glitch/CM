# ADR-001 Map Provider Selection

Date: 2026-06-03

Status: Accepted

---

## Context

커플이 저장한 장소를 지도 위에 표시해야 한다.

필수 요구사항:

- 마커
- 폴리라인
- 커스텀 오버레이
- RN 연동

---

## Options Considered

### Naver Maps

장점

- RN 라이브러리 성숙

단점

- 검색 API와 플랫폼 분리
- NCP 의존

---

### Kakao Native SDK

장점

- 카카오 생태계

단점

- RN 라이브러리 기능 부족
- 마커/폴리라인 제약

---

### Kakao JS SDK + WebView

장점

- 기능 완전
- 마커 지원
- 폴리라인 지원
- 커스텀 오버레이 지원

단점

- WebView 사용
- JS SDK 의존

---

## Decision

Kakao JS SDK + WebView 채택

---

## Rationale

제품 요구사항을 유일하게 모두 충족.

---

## Consequences

긍정

- 기능 구현 가능

부정

- WebView 유지 필요