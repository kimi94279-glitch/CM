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

Naver Search API

경로:

App
→ Supabase Edge Function
→ Naver Local Search

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
