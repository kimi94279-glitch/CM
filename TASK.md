---
title: Current Task
status: active
owner: project
last_review: 2026-06-07
category: task
related:
  - HARNESS.md
---
# TASK.md

## Current Task

Map MVP (WebView + Kakao JS SDK, BoardDetail 지도 탭)

## Status (Map MVP)

Done (코드 / 정적 검증) — Metro 리로드 후 런타임 검증 대기

- [x] 스파이크/진단/__DEV__ Spike 화면 제거
- [x] MapWebView 컴포넌트 + HTML 템플릿 분리(mapWebViewHtml.ts)
- [x] BoardDetail 목록/지도 토글, 마커/폴리라인, fitBounds(0/1/2+)
- [x] 마커 클릭 → highlightedId만 설정(화면 전환 없음), 목록 탭에서 PlaceCard 강조
- [x] order_index 방어적 재정렬 후 전달
- [x] DB/검색/Place CRUD 무변경, typecheck/lint 통과
- [ ] 런타임 검증 (지도 탭: 마커/폴리라인/클릭 강조)
- 제외: 실시간 / 드래그정렬 / 메모 / 반응 / 자동스크롤

---

## (이전) Place MVP (검색 → 선택 → 추가, BoardDetail)

## Status (Place MVP)

Done (코드 / 정적 검증) — Edge Function 배포 + 네이버 키 + 런타임 검증 대기

- [x] place-search Edge Function (네이버 지역검색 프록시, Secret 서버 보관)
- [x] placeSearchService / placeService / usePlaces·usePlaceSearch
- [x] PlaceAddScreen(검색→결과[이름+주소]→추가) / BoardDetailScreen / PlaceCard
- [x] BoardCard 탭 → BoardDetail, 라우팅 연결
- [x] lat/lng NOT NULL 유지 (0003 불필요), DB 스키마 변경 없음
- [x] tsconfig/eslint에서 supabase/ 제외, typecheck/lint 통과
- [ ] (사용자) 네이버 키 발급 + secrets set + functions deploy
- [ ] 런타임 검증 (검색→추가→카드, 좌표 실측)
- 범위 외(다음): 지도 / 정렬 / 메모 / 반응 / 실시간

---

## (이전) Board MVP (보드 생성 + 목록)

## Status (Board MVP)

Done (코드 / 정적 검증) — 런타임 검증 대기

- [x] HomePlaceholder 제거 → BoardList 홈
- [x] boardService / useBoards (생성·목록, React Query)
- [x] CreateBoard 화면 + BoardCard + 제품형 Empty State
- [x] 솔로/커플 워크스페이스 모두 동작 (boards.couple_id = 워크스페이스, DB 변경 없음)
- [x] typecheck / lint 통과
- [ ] 런타임 검증 (솔로에서 보드 생성/목록)
- 범위 외(다음 TASK): BoardDetail / Place / Map

---

## (이전) Supabase 프로비저닝 및 Auth 흐름 런타임 검증

## Scope

1. Supabase 프로젝트 준비
2. .env 설정
3. 0001_init.sql 적용
4. 이메일 인증 비활성화
5. accept_invite RPC 실행 권한 확인
6. Expo 실행
7. 로그인 → 프로필 생성 → 커플 연결 런타임 검증

## Out Of Scope

- Board / Place 기능 (검증 완료 후 진행)
- Google OAuth / Realtime 자동연결

## Status

In Progress — Supabase 설정 완료(.env/마이그레이션/권한), EAS Dev Build 전환 준비 완료

- [x] Supabase 프로비저닝 (.env, 0001_init.sql, accept_invite 권한)
- [x] EAS Dev Build 준비: expo-dev-client / eas.json / android.package
- [x] Gradle 9 빌드 차단 해결: foojay-resolver 0.5.0→1.0.0 (patch-package)
- [x] 로컬 Gradle 구성 통과 검증 (`:app:help` BUILD SUCCESSFUL)
- [x] `:app:assembleDebug` 전체 빌드 성공 (23m45s, app-debug.apk 181MB)
- [ ] APK 설치 + Auth 흐름 런타임 검증 (시나리오 A/B, 목표 1~7)

### 추가 구현: Solo Mode (A안) — 코드 완료, DB 적용 대기

- [x] 0002_solo_workspace.sql (couples=워크스페이스, solo 상태, create_solo_workspace, accept_invite 승격)
- [x] 게이팅 워크스페이스 기준 변경 + CoupleConnect "먼저 둘러보기" + Home 전환 배너
- [x] 문서 동기화 (DATABASE/FLOW_AUTH/UX_AUTH/UX_BOARD)
- [x] typecheck / lint 통과
- [ ] 0002 마이그레이션 Supabase 적용 (사용자) + 런타임 검증

---

## Post-MVP Follow-up

MVP 완성 후 디자인 보강 예정 (DESIGN.md `Post-MVP` 섹션에서 관리)

---

## Completed Tasks

### Auth MVP 구현 (코드 + 정적 검증)

- 7개 화면 + HomePlaceholder, authService/coupleService
- typecheck / lint / expo-doctor 통과
- 런타임 검증은 별도(현재 진행 작업)

Status: Done (정적)

### Board 및 Place 경험 UX/UI 설계

- UX_BOARD.md 작성

Status: Done

### Auth 화면 UX/UI 설계

- UX_AUTH.md 작성 (7개 화면)

Status: Done

### Auth 및 Couple 연결 사용자 흐름 설계

- FLOW_AUTH.md 작성
- 확정 정책: 프로필 클라이언트 생성 / 온보딩 게이팅 강제 / 이메일 인증 비활성 / 초대 딥링크+코드

Status: Done

### Supabase Database Design

- DATABASE.md 설계 문서 작성
- supabase/migrations/0001_init.sql 초안 작성 (미적용)

Status: Done

### DESIGN.md 작성

- 디자인 컨셉 / 브랜드 방향성 / 컬러 / 타이포 / 컴포넌트 / 와이어프레임 정의

Status: Done

### 프로젝트 초기 세팅

- Expo + TypeScript 프로젝트 생성
- ESLint / Prettier 설정
- Supabase 연결 준비
- 폴더 구조 생성

Status: Done
