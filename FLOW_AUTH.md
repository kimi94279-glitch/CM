---
title: Auth & Couple Flow
status: active
owner: project
last_review: 2026-06-07
category: flow
related:
  - DATABASE.md
  - UX_AUTH.md
---
# FLOW_AUTH.md

# Couple Map — Auth & Couple 연결 흐름

## Overview

이 문서는 Couple Map의 인증(로그인/회원가입)과 커플 연결(초대 생성/수락) 사용자 흐름을 정의한다.

- 코드/UI 구현, DB 변경은 이 문서의 범위가 아니다.
- 데이터 설계는 DATABASE.md를 따른다. 특히 커플 생성은 `accept_invite` RPC를 통해서만 이루어진다.

> ⚠️ **개정(Solo Mode 도입):** 아래 2번 "혼자 사용 불가" 정책은 폐기되었다. 현재는 **커플 연결 없이도 솔로 워크스페이스로 앱 사용이 가능**하다. 자세한 내용은 이 문서 끝 "Amendment: Solo Mode" 및 DATABASE.md 참조.

### 확정된 정책

1. **프로필 생성:** 클라이언트 방식. 최초 로그인 후 `users` 행이 없으면 ProfileSetup에서 생성한다. DB 트리거는 도입하지 않는다(Future Considerations 참조).
2. ~~**온보딩 게이팅:** 강제한다. active 커플이 없는 사용자는 보드 기능에 진입할 수 없다.~~ → **개정**: 솔로 진입 허용(아래 Amendment 참조).
3. **이메일 인증:** MVP에서는 비활성화한다(verify email 미사용). Google OAuth와 이메일/비밀번호 로그인은 유지한다.
4. **초대 수단:** 딥링크 + 초대 코드 2가지를 제공한다. 코드는 링크 실패 시의 백업 수단이다.

---

## 1. 사용자 흐름

### 1-1. 로그인

```text
앱 실행 → 세션 확인 (getSession)
  ├─ 세션 있음 → [온보딩 판별] (2-5 참조)
  └─ 세션 없음 → 로그인 화면
        ├─ Google 로그인  → OAuth → 세션 획득
        └─ 이메일 로그인   → 이메일/비밀번호 → 세션 획득
              → [온보딩 판별]
```

### 1-2. 회원가입

```text
회원가입 화면 (이메일)
  → signUp(email, password)
  → (이메일 인증 비활성화) 즉시 세션 획득
  → [온보딩 판별] → 프로필 없음 → ProfileSetup
```

- Google은 최초 로그인이 곧 가입이다. 별도 가입 화면이 필요 없다.
- 이메일 확인 단계가 없으므로 가입 직후 바로 사용 흐름으로 진입한다.

### 1-3. 온보딩 판별 (게이팅의 핵심)

```text
세션 있음
  → users 행 있음?
       ├─ 아니오 → ProfileSetup (닉네임 입력 → users 생성)
       └─ 예 → active 커플 있음?
                  ├─ 아니오 → CoupleConnect
                  └─ 예 → Home (BoardList)
```

- 순서: **Login → ProfileSetup → CoupleConnect → Home(BoardList)**
- active 커플이 없으면 Home으로 진입할 수 없다.

### 1-4. 초대 링크/코드 생성 (초대자)

```text
CoupleConnect 화면 (active 커플 없음)
  → "초대하기"
  → invite_token 생성 (클라이언트 난수)
  → couple_invites INSERT (created_by = 나, expires_at 설정)
  → 산출물 2가지:
        1) 딥링크  couplemap://invite?token=...
        2) 초대 코드 (token 기반 사람이 읽기 쉬운 코드)
  → OS 공유 시트로 전달 / 코드 복사
  → "상대가 수락하면 연결돼요" 대기 안내
```

- 이 시점에 `couples`는 생성되지 않는다. 초대자는 여전히 `no_couple` 상태이며, 대기 표시는 `couple_invites` 기준이다.
- 코드는 링크가 동작하지 않는 환경(앱 미설치, 메신저 링크 차단 등)을 위한 백업 수단이다.

### 1-5. 초대 수락 (수락자)

```text
초대 수신 (딥링크 또는 코드)
  ├─ 딥링크 클릭 → 앱 열림 (미설치 시 스토어 → 설치 후 토큰 보존)
  └─ 코드 입력  → InviteJoin 화면에서 코드 → token 확인

  → 인증 상태 확인
       ├─ 미인증 → 로그인/회원가입 먼저 (토큰 보류)
       └─ 인증됨 → 계속
  → 프로필 없음 → ProfileSetup (토큰 계속 보류)
  → accept_invite(token) RPC 호출
       → couples 생성(active) + couple_invites.used_at 기록
  → Home (BoardList)
```

- 인증/프로필이 먼저 필요한 경우 토큰을 보류했다가 완료 후 `accept_invite`를 자동 실행한다.

---

## 2. 화면 흐름

```text
[Splash]
  │  세션 확인 + 딥링크(초대 토큰) 판별·보류
  │
  ├─(세션 없음)────────────────> [Auth]
  │                                 ├─ Login (Google / Email)
  │                                 └─ Signup (Email)
  │                                     │ 인증 성공
  │                                     ▼
  ├─(프로필 없음)──────────────> [ProfileSetup]  닉네임 입력 → users 생성
  │                                     ▼
  ├─(active 커플 없음)─────────> [CoupleConnect]
  │                                 ├─ [InviteCreate]  링크/코드 공유 · 대기
  │                                 └─ [InviteJoin]    코드 입력 / 딥링크 수락
  │                                     │ accept_invite 성공
  │                                     ▼
  └─(active 커플 있음)─────────> [Home / BoardList]
```

- **게이팅:** 각 관문(세션 → 프로필 → 커플)을 통과해야 다음 화면으로 진행한다.
- **딥링크 진입:** 보류된 초대 토큰은 인증·프로필 완료 직후 자동으로 수락 처리된다.

---

## 3. 상태 다이어그램

### 3-1. 인증 상태

```text
unauthenticated
   │ 로그인/가입 시도
   ▼
authenticating
   │ 성공
   ▼
authenticated_no_profile      (auth 세션 O, users 행 X)
   │ ProfileSetup 완료
   ▼
authenticated_no_couple       (프로필 O, active 커플 X)
   │ accept_invite 성공
   ▼
authenticated_active          (active 커플 O)  ← 정상 사용 상태

(로그아웃 / 세션 만료 → unauthenticated)
```

### 3-2. 커플 상태 (사용자 관점)

```text
no_couple ──(내가 초대 생성)──> no_couple (+ 미사용 invite 보유)
no_couple ──(상대가 내 초대 수락 / 내가 상대 초대 수락)──> active
active ──(관계 종료)──> ended
ended ──(새 초대 생성/수락)──> active
```

- 초대 생성은 커플 상태를 바꾸지 않는다(여전히 `no_couple`).
- 관계 종료는 삭제가 아니라 `couples.status = 'ended'`이며 기록은 보존된다(DATABASE.md).

### 3-3. 초대 상태

```text
created ──(수락)──> used        (used_at 기록)
created ──(시간 경과)──> expired (expires_at 초과, used_at = NULL)
```

- used / expired 초대는 무효이며 수락할 수 없다.

---

## 4. 예외 상황

| 구분 | 케이스 | 처리 |
| --- | --- | --- |
| 로그인 | 잘못된 이메일/비밀번호 | "이메일 또는 비밀번호를 확인해주세요" |
| 로그인 | 미가입 이메일 | 회원가입 유도 |
| OAuth | 사용자 취소 / 팝업 닫힘 | 조용히 로그인 화면으로 복귀 |
| 가입 | 이미 가입된 이메일 | 로그인 유도 |
| 프로필 | 닉네임 빈값 / 길이 초과 | 폼 검증, 진행 차단 |
| 초대 생성 | 이미 active 커플 보유 | 생성 차단, "이미 연결된 상대가 있어요" |
| 초대 수락 | invalid 토큰 | "유효하지 않은 초대예요" |
| 초대 수락 | expired 토큰 | "만료된 초대예요. 새 초대를 요청해주세요" |
| 초대 수락 | used 토큰 | "이미 사용된 초대예요" |
| 초대 수락 | 본인 초대 수락 | "본인 초대는 수락할 수 없어요" |
| 초대 수락 | 양측 중 누군가 active 커플 보유 | "이미 연결된 계정이 있어요" |
| 코드 입력 | 형식 오류 / 없는 코드 | "초대 코드를 다시 확인해주세요" |
| 딥링크 | 토큰 없는/깨진 링크 | 일반 진입으로 폴백 |
| 딥링크 | 앱 미설치 | 스토어 이동 → 설치 후 토큰 복원하여 수락 |
| 공통 | 네트워크 실패 | 재시도 가능한 에러 안내 |

- 초대 수락 실패 사유(invalid / expired / used / self / already-in-couple)는 `accept_invite` RPC가 던지는 예외를 위 메시지로 매핑한다.
- 모든 네트워크 요청은 예외 처리를 포함하며 오류를 무시하지 않는다(HARNESS.md).

---

## 5. Supabase Auth 연동 방식

### 5-1. 인증 수단

- Google OAuth
- 이메일 / 비밀번호
- **이메일 확인(verify email)은 MVP에서 비활성화** (초기 이탈 감소 · 구현 단순화 · 검증 속도)

### 5-2. 세션 관리

- 초기 세팅의 Supabase 클라이언트 설정을 사용한다: AsyncStorage 영속 + `autoRefreshToken` + `persistSession`.
- 앱 시작 시 `getSession()`으로 초기 상태를 결정하고, 이후 `onAuthStateChange`를 구독해 상태 전이를 반영한다.

### 5-3. 프로필 생성 (클라이언트 방식, 확정)

- 로그인 직후 `users` 행 존재 여부를 확인한다.
- 없으면 ProfileSetup에서 닉네임을 받아 `users` 행을 생성한다(`id = auth.uid()`).
- DB 트리거 기반 자동 생성은 도입하지 않는다.

### 5-4. 딥링크 / OAuth 리다이렉트

- 스킴: `couplemap://`
- 초대 딥링크: `couplemap://invite?token=...`
- OAuth 리다이렉트 URL을 Supabase 및 Google 콘솔에 등록한다.
- 미인증 상태에서 초대 딥링크로 진입하면 토큰을 보류했다가 인증·프로필 완료 후 `accept_invite`를 실행한다.

### 5-5. 초대 코드 (백업 수단)

- 딥링크와 동일한 `invite_token`에 기반한 사람이 읽기 쉬운 코드를 제공한다.
- 링크가 동작하지 않는 환경에서 InviteJoin 화면에 코드를 입력해 동일한 수락 흐름을 탄다.

### 5-6. 커플 생성 경로 (RLS 정합)

- 커플 생성은 반드시 `accept_invite` RPC를 통해서만 이루어진다(DATABASE.md).
- 클라이언트는 `couples`를 직접 INSERT하지 않는다.
- 단일 활성 커플 검증은 RPC 내부에서 수행된다.
- 적용 단계에서 `accept_invite`에 대한 실행 권한 부여(authenticated 역할)가 필요하다. (적용 단계 사항)

### 5-7. 서비스 계층 (책임 위치)

ARCHITECTURE.md의 데이터 흐름(화면 → hook → service → Supabase)을 따른다.

- `services/authService` — 로그인/가입/로그아웃/세션, 프로필 존재 확인·생성
- `services/coupleService` — 초대 생성, `accept_invite` 호출, 커플 상태 조회

> 구현은 이 문서의 범위가 아니며, 책임 위치만 명시한다.

---

## 6. Future Considerations

- **프로필 자동 생성 트리거:** `auth.users` INSERT 시 `users` 행을 자동 생성하는 DB 트리거 방식. 현재는 도입하지 않으며(클라이언트 방식 채택) 향후 검토 대상으로만 기록한다.
- **이메일 인증 재도입:** 서비스 신뢰성·스팸 방지가 필요해지면 verify email을 활성화할 수 있다.
- **추가 OAuth 제공자:** Apple 로그인 등(스토어 정책 대응).
- **초대 만료/정리 정책:** 사용·만료된 `couple_invites` 정리 배치(누적 대비).

---

## Amendment: Solo Mode (0002)

진입 장벽을 낮추기 위해 "커플 연결 없이 먼저 사용" 흐름을 추가한다.

### 변경된 온보딩

```text
Login → ProfileSetup → CoupleConnect
   ├─ [상대 초대하기] → InviteCreate → (상대 수락 시 active 커플)
   ├─ [먼저 둘러보기] → create_solo_workspace → solo 워크스페이스 → Home
   └─ [코드 입력] → InviteJoin → accept_invite → active 커플
```

- 게이팅 상태: `unauthenticated → no_profile → no_workspace → (solo | active)`.
- `solo`와 `active` 모두 Home(앱 본체)에 진입한다. 커플 연결을 강제하지 않는다.

### 데이터 모델 (DATABASE.md)

- `couples`가 "1~2인 워크스페이스"로 일반화됨: `solo`(user_b NULL) / `active` / `ended`.
- 솔로의 보드는 워크스페이스에 소속되고, 초대 수락 시 `active`로 승격되어 **데이터가 유지**된다.

### 솔로 → 커플 전환 유도 (Conversion)

강제하지 않고 자연스러운 진입점을 상시 제공한다.

- **Home 상단 배너 (구현됨):** solo일 때 "혼자 사용 중이에요 · 상대 초대하기" → InviteCreate.
- **빈 상태 CTA (Board 구현 시):** 보드/장소 빈 상태에 보조 CTA "함께하면 더 좋아요 · 상대 초대".
- **Profile CTA (Profile 구현 시):** 프로필/설정에 "상대 연결" 항목 상시 노출.
- 비권장: 강제 모달/팝업(요구사항 "강제하지 않음" 위배).

### 한계 (MVP)

- 수락자가 이미 데이터(보드)가 있는 솔로 워크스페이스면 합류 불가(`acceptor has solo data`) → 두 솔로 데이터 병합은 향후 기능.
- 비어있는 솔로 워크스페이스는 수락 시 자동 정리 후 합류.
