---
title: Development Harness
status: active
owner: project
last_review: 2026-06-07
category: process
related:
  - ARCHITECTURE.md
  - ADR-007 Branch Strategy
---
# HARNESS.md

# Couple Map Development Harness

## Purpose

이 문서는 Couple Map 프로젝트의 개발 절차와 작업 규칙을 정의한다.

Claude Code는 이 문서의 규칙을 따라야 한다.

이 문서의 목적은 다음과 같다.

- 범위 확장 방지
- 불필요한 리팩토링 방지
- 유지보수성 확보
- 데이터 안전성 확보
- 예측 가능한 개발 프로세스 유지

---

# Development Contract

가장 중요한 규칙

사용자 승인 없이 코드를 작성하지 않는다.

모든 작업은 아래 순서를 따른다.

1. 요구사항 분석
2. 구현 계획
3. 영향도 분석
4. 사용자 승인
5. 구현
6. 검증
7. 리뷰

승인되지 않은 구현은 무효로 간주한다.

---

# Required Workflow

새로운 작업 요청을 받으면

절대로 바로 코드를 작성하지 않는다.

반드시 아래 형식으로 응답한다.

## 목표

무엇을 구현하는가

---

## 구현 계획

어떤 방식으로 구현할 것인가

---

## 수정 파일

수정 예정 파일 목록

---

## 신규 파일

생성 예정 파일 목록

---

## 데이터 변경

DB 변경 여부

---

## 위험 요소

예상 가능한 문제

---

## 테스트 계획

어떻게 검증할 것인가

---

사용자 승인 전 구현 금지

---

# Approval Rules

다음 작업은 반드시 사용자 승인 필요

## 구조 변경

- 폴더 구조 변경
- 프로젝트 구조 변경

---

## 데이터 변경

- DB 스키마 변경
- Migration 추가
- 외래키 수정

---

## 의존성 변경

- 라이브러리 추가
- 라이브러리 제거
- 버전 업그레이드

---

## 인증 변경

- 로그인 방식 변경
- 권한 구조 변경

---

# Minimal Change Principle

기존 코드가 정상 동작한다면

대규모 리팩토링을 수행하지 않는다.

전체 파일 재작성 금지

불필요한 추상화 금지

새로운 디자인 패턴 도입 금지

최소 수정으로 문제를 해결한다.

---

# Stability First

항상 다음 순서로 검토한다.

1. 치명적 오류
2. 데이터 손상 위험
3. 보안 문제
4. 성능 문제
5. 유지보수성
6. 가독성

스타일 개선은 최우선 사항이 아니다.

---

# Couple Map Product Constraints

이 프로젝트의 핵심은

- 장소
- 계획
- 협업
- 메모
- 반응

이다.

---

다음 기능은 사용자가 요청하기 전까지 구현하지 않는다.

## Communication

- 채팅
- DM
- 음성 메시지

---

## Location Tracking

- GPS 추적
- 실시간 위치 공유
- 백그라운드 위치 수집

---

## AI

- AI 장소 추천
- AI 일정 생성
- AI 코스 최적화

---

## Social

- 공개 피드
- 팔로우
- 커뮤니티
- 좋아요 시스템

---

## Commerce

- 결제
- 광고
- 예약 기능

---

# Architecture Rules

모든 구현은 ARCHITECTURE.md를 따른다.

아래 규칙을 우선 적용한다.

## Frontend

- React Native
- Expo
- TypeScript

---

## State Management

초기 MVP

- React Query
- Local State

Redux 도입 금지

---

## Data Access

UI에서 직접 데이터베이스 접근 금지

모든 외부 통신은 Service Layer 사용

예시

UI

↓

Service

↓

Supabase

---

# Type Safety Rules

TypeScript 타입 정의 필수

가능한 경우 any 사용 금지

타입 추론보다 명시적 타입 선호

---

# Error Handling Rules

모든 네트워크 요청은 예외 처리 포함

try/catch 누락 금지

사용자가 이해할 수 있는 오류 메시지 제공

오류 무시 금지

---

# Database Rules

모든 테이블은

- created_at
- updated_at

포함

---

삭제 정책은 명확히 설명해야 한다.

Cascade 사용 시 이유를 설명한다.

---

데이터 손실 가능성이 있는 작업은 반드시 경고한다.

---

# Testing Rules

구현 후 반드시 테스트 방법을 제공한다.

## 최소 검증 항목

- 정상 동작
- 예외 상황
- 네트워크 실패
- 빈 데이터

---

테스트 없이 완료 선언 금지

---

# Review Rules

모든 구현 후 반드시 리뷰 수행

출력 형식

## 변경 사항

무엇을 변경했는가

---

## 잠재 버그

발생 가능한 문제

---

## 데이터 위험성

데이터 손실 가능성

---

## 성능 영향

성능에 미치는 영향

---

## 테스트 결과

수행한 검증

---

## 후속 작업

다음 단계 제안

---

# When Uncertain

추측하지 않는다.

가정하지 않는다.

문서를 다시 읽는다.

필요하면 사용자에게 질문한다.

모르는 상태에서 구현하지 않는다.

---

# Highest Priority Rule

이 프로젝트는 빠른 개발보다

안정적인 개발을 우선한다.

사용자 승인 없이 구현하지 않는다.

사용자 승인 없이 범위를 확장하지 않는다.

사용자 승인 없이 구조를 변경하지 않는다.
