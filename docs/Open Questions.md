# Open Questions

## 검색 공급자

현재:

- 검색 = 네이버
- 지도 = 카카오

혼합 구조 유지 여부 검토 필요

### 선택지

1. 현 상태 유지
2. 카카오 Local API로 통합

---

## 장소 메모 구조

옵션:

- places 테이블 확장
- 별도 notes 테이블

미결정

---

## 커플 관계 모델

필요:

- 초대
- 수락
- 공유 범위

미설계

---

## 실시간 동기화

필요 여부 미결정

옵션:

- Supabase Realtime
- 수동 새로고침

---

## 사진 저장

옵션:

- Supabase Storage
- 외부 CDN

미결정

---

## 지도 UX

현재:

목록 ↔ 지도 토글

검토:

- 동시 표시
- Bottom Sheet
- 자동 스크롤

---

## 기술 리스크

### 검색 API

현재:

Naver Search API 사용

리스크:

- 별도 Edge Function 필요
- Secret 관리 필요

---

### WebView 지도

현재 성공

리스크:

- 카카오 JS SDK 정책 변경
- WebView 성능

낮음
