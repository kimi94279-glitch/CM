# ARCHITECTURE.md

# Couple Map Architecture

## Purpose

이 문서는 Couple Map의 기술 구조와 설계 원칙을 정의한다.

목표는 다음과 같다.

- 단순성
- 유지보수성
- 안정성
- 확장 가능성

초기 MVP에서는 과도한 추상화를 금지한다.

---

# Technology Stack

## Frontend

- React Native
- Expo
- TypeScript

---

## Backend

- Supabase

사용 기능

- Authentication
- Database
- Realtime

---

## Map

- Naver Map SDK
- Naver Directions API

---

# Architecture Principles

## Simplicity First

현재 요구사항을 해결하는 가장 단순한 구조를 선택한다.

미래를 위한 과도한 설계 금지

---

## Readability First

복잡한 추상화보다 이해 가능한 코드를 우선한다.

---

## Stable Before Clever

똑똑한 코드보다 안정적인 코드를 우선한다.

---

## Feature Driven Structure

기능 중심으로 구조를 구성한다.

---

# Directory Structure

```text
src/

├── screens/
├── components/
├── services/
├── hooks/
├── types/
├── constants/
├── utils/
├── navigation/
├── assets/

```

---

# Responsibilities

## screens

화면 구성

역할

- UI 배치
- 사용자 이벤트 처리

금지

- 직접 DB 접근
- 직접 API 호출

---

## components

재사용 가능한 UI 컴포넌트

예시

- PlaceCard
- ReactionButton
- BoardHeader

---

## services

외부 통신 담당

예시

- authService
- boardService
- placeService
- mapService

모든 데이터 접근은 services를 통해 수행

---

## hooks

상태 관리 및 재사용 로직

예시

- useBoards
- usePlaces
- useCouple

---

## types

TypeScript 타입

---

## utils

순수 함수

예시

- 날짜 변환
- 거리 계산
- 문자열 처리

---

# State Management

초기 MVP

## 허용

- React Query
- useState
- useMemo
- useCallback

---

## 금지

- Redux
- MobX
- Recoil

---

# Data Flow

모든 데이터 흐름은 아래 구조를 따른다.

```text
Screen

↓

Hook

↓

Service

↓

Supabase
```

UI에서 직접 Supabase 호출 금지

---

# Database

## users

```sql
id
nickname
profile_image

created_at
updated_at
```

---

## couples

```sql
id

user_a_id
user_b_id

created_at
updated_at
```

---

## boards

```sql
id

couple_id

title

created_at
updated_at
```

---

## places

```sql
id

board_id

name

latitude
longitude

order_index

created_by

created_at
updated_at
```

---

## place_memos

```sql
id

place_id

user_id

content

created_at
updated_at
```

---

## place_reactions

```sql
id

place_id

user_id

reaction_type

created_at
```

---

# Realtime Scope

Realtime은 최소 범위만 적용

적용 대상

- 장소 추가
- 장소 삭제
- 장소 순서 변경
- 메모 추가
- 반응 추가

---

적용 제외

- 채팅
- 위치 추적
- Presence 시스템

---

# Error Handling

모든 네트워크 요청은

try/catch 포함

---

사용자가 이해할 수 있는 오류 메시지 제공

---

에러 무시 금지

---

# Type Safety

TypeScript 사용

---

가능한 경우 any 사용 금지

---

타입 정의 우선

---

# API Design

모든 서비스는 명확한 함수 단위로 구성

예시

```typescript
boardService.createBoard();

boardService.deleteBoard();

placeService.addPlace();

placeService.removePlace();
```

```

거대한 Service 클래스 금지

```

---

# UI Principles

## 계획 중심

지도보다 계획이 중요하다.

---

## 장소 중심

장소 카드가 핵심 UI

---

## 협업 중심

두 사용자의 상호작용이 중요하다.

---

## 모바일 우선

한 손 사용 가능해야 한다.

---

# Performance Rules

성능 문제가 확인되기 전까지

과도한 최적화 금지

---

측정 없는 최적화 금지

---

가독성을 해치는 최적화 금지

---

# Future Expansion

향후 고려 가능

- 방문 기록
- 사진 저장
- 여행 모드
- 장소 카테고리
- 장소 즐겨찾기

---

MVP에는 포함하지 않는다.

---

# Final Rule

복잡함보다 단순함을 선택한다.

과도한 설계보다 구현 가능한 설계를 선택한다.

Couple Map은 스타트업 MVP이며,
엔터프라이즈 플랫폼이 아니다.

현재 요구사항을 가장 단순하고 안정적으로 해결하는 구조를 유지한다.
