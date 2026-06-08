# Architecture

## Frontend

### Framework

- React Native
- Expo SDK 56
- RN 0.85
- New Architecture

### Navigation

- React Navigation

### State

- TanStack Query

### 지도

- react-native-webview
- Kakao Maps JavaScript SDK
- MapBox
- 

---

## Backend

### Platform

Supabase

구성:

- Auth
- Database
- Edge Functions

---

## Database

### 주요 테이블

#### boards

보드

#### places

장소

주요 필드:

- id
- board_id
- name
- latitude
- longitude
- order_index
- provider

---

## 검색

### 현재

Kakao Local API

경로:

App  
→ Supabase Edge Function (`place-search`)  
→ Kakao Local API

---

### 상세

- 지도 공급자: Kakao Maps
    
- 검색 공급자: Kakao Local API
    
- 인증 방식: `KAKAO_REST_API_KEY`
    
- 검색 결과 좌표: WGS84 (`x`, `y`) 직접 사용
    
- 응답 정규화: Supabase Edge Function에서 처리
    

---

### 선택 이유

기존에는 지도는 Kakao Maps, 검색은 Naver Search API를 사용하여 공급자가 분리되어 있었다.

현재는 검색 공급자를 Kakao Local API로 통합하여:

- 단일 공급자 구조 유지
    
- API Key 관리 단순화
    
- 좌표 변환 제거
    
- 검색 결과와 지도 데이터 일관성 확보
    
- 유지보수 비용 감소
    

를 달성한다.

---

## 지도

### 결정

카카오 JS SDK + WebView

### 이유

네이티브 카카오 SDK:

- 마커 부족
- 폴리라인 부족

WebView:

- 마커 지원
- 폴리라인 지원
- CustomOverlay 지원

---

## 배포

### 앱

Expo Dev Build

### 백엔드

Supabase Cloud

---
[[ADR-006 Search Provider Consolidation]]