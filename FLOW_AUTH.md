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
  → 산출물 2가지 (2026-10-26 개정: 공유 링크는 웹 페이지 — 아래 Amendment)
        1) 초대 링크  https://…/invite/?code=...  (웹 페이지가 couplemap://invite?token=... 로 앱을 연다)
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

- 인증/프로필이 먼저 필요한 경우 토큰을 보류했다가 완료 후 InviteJoin 으로 이어 준다. ~~`accept_invite`를 자동 실행한다.~~ → 개정(2026-10-26): 솔로 데이터가 합쳐지므로 자동 수락하지 않고 미리보기 후 한 번 확인받는다.

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
- **딥링크 진입:** 보류된 초대 토큰은 인증·프로필 완료 직후 InviteJoin(코드 채움 + 미리보기)으로 이어진다. 수락은 사용자가 누른다(2026-10-26 개정).

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
| 딥링크 | 앱 미설치 | 웹 페이지에서 코드 복사 → 설치 후 InviteJoin "붙여넣기" (2026-10-26 개정) |
| 공통 | 네트워크 실패 | 재시도 가능한 에러 안내 |

- 초대 수락 실패 사유(invalid / expired / used / self / already-in-couple)는 `accept_invite` RPC가 던지는 예외를 위 메시지로 매핑한다.
- 모든 네트워크 요청은 예외 처리를 포함하며 오류를 무시하지 않는다(HARNESS.md).

---

## 5. Supabase Auth 연동 방식

### 5-1. 인증 수단

- ~~Google OAuth~~ → 개정(2026-10-27): **카카오**(모든 기기, 브라우저 인증 세션 + PKCE code 교환) · **Apple**(iOS, 네이티브 ID 토큰 + nonce — 서드파티 로그인이 있으면 App Store 필수). 설정은 SUPABASE_SETUP.md §4.5
- 이메일 / 비밀번호 (로그인 화면에서 "이메일로 로그인"으로 접어 둠)
- 소셜 로그인 이름(카카오 닉네임 · Apple 첫 로그인 이름)은 ProfileSetup 닉네임 기본값으로 채운다. Apple 은 이름을 첫 로그인에만 주므로 `updateUser({ data: { full_name } })` 로 저장
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
- 미인증 상태에서 초대 딥링크로 진입하면 토큰을 보류했다가(AsyncStorage, 48시간) 인증·프로필 완료 후 InviteJoin 으로 이어 준다(`src/hooks/usePendingInvite.tsx`).
- React Navigation `linking` 설정은 쓰지 않는다 — 초대 링크는 게이팅 단계와 상관없이 받아야 해서 위 훅이 직접 처리한다.

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

- ~~수락자가 이미 데이터(보드)가 있는 솔로 워크스페이스면 합류 불가(`acceptor has solo data`) → 두 솔로 데이터 병합은 향후 기능.~~ → 0008 에서 해소: 수락자의 보드를 함께 쓰는 공간으로 옮긴 뒤 솔로 행을 지운다.
- 비어있는 솔로 워크스페이스는 수락 시 자동 정리 후 합류.

---

## Amendment (2026-10-26): 초대 흐름 v2 — 웹 링크 · 코드 보존 · 솔로 합치기

**배경:** 앱이 없는 상대는 `couplemap://` 링크를 열 수 없고, 로그인 전에 받은 초대는 사라졌으며, 혼자 먼저 그리던 사람은 초대를 받을 수 없었다(`acceptor has solo data`). 문구도 커플 전용이라 "같이 그릴 사람" 톤으로 바꿨다(DESIGN.md 포지셔닝).

**1. 웹 링크 (앱이 없어도 열림)**
- 공유 링크 = `INVITE_WEB_URL?code=XXXXXXXX` (`src/constants/config.ts`). 정적 페이지 `web/invite/index.html` 를 GitHub Pages 로 배포(`.github/workflows/invite-page.yml`).
- 페이지: 초대 코드 + "코드 복사" + "앱에서 열기". Android 는 `intent://…;package=com.couplemap.mobile;S.browser_fallback_url=…#noapp`, 그 외는 `couplemap://invite?token=…`. 앱이 안 열리면 설치 안내를 강조한다.
- 공유 메시지에는 링크와 코드를 같이 넣는다(링크가 막힌 메신저 대비).
- 유니버설 링크/App Links(https 링크가 바로 앱을 여는 것)는 자체 도메인이 생기면 도입한다.

**2. 코드 보존**
- 앱을 연 링크(`couplemap://invite?token=…`, `…/invite/?code=…`)의 코드를 AsyncStorage 에 48시간 보관한다. 앱을 껐다 켜도 남는다.
- Login · Signup · ProfileSetup 에 "받은 초대를 기억해 둘게요" 안내를 띄운다.
- no_workspace / solo 가 되면 InviteJoin 으로 이동(코드 채움). active 면 "이미 같이 그리는 사람이 있어요" 안내 후 버린다.
- 앱 설치 직후처럼 링크가 앱에 전달되지 않은 경우: 웹 페이지에서 코드를 복사 → InviteJoin "붙여넣기"(공유 메시지 전체를 붙여넣어도 링크·코드를 찾는다).

**3. 솔로 데이터 합치기 (0008)**
- `accept_invite`: 결과 공간 = 초대자 솔로 승격 또는 새 active. 수락자 솔로가 있으면 그 보드를 결과 공간으로 옮기고 솔로 행 삭제. 장소·메모·반응·스티커·그림은 board_id 로 따라오고 작성자는 그대로라 색 구분이 유지된다.
- `invite_preview(token)` (authenticated 전용): `{state: ok|invalid|used|expired|own|taken, inviter_name}`. InviteJoin 이 "○○님이 같이 그리자고 해요"와 "혼자 그리던 지도 N개도 함께 보게 돼요"를 수락 전에 보여준다.
- 자동 수락 없음 — 데이터가 합쳐지므로 사용자가 "같이 그리기"를 누른다.

**4. 초대한 쪽 갱신**
- InviteCreate 화면에 있는 동안 5초마다 공간 상태를 확인해, 상대가 받으면 바로 목록으로 넘어간다.
- 솔로 상태에서 앱으로 돌아올 때(AppState active) 공간을 다시 확인한다.

---

## Amendment (2026-10-27): 로그인 없이 시작 (게스트)

**결정:** 기본 기능(지도 만들기·그리기·메모·반응·스티커)은 로그인 없이 다 쓴다. **같이 그리기(초대 보내기·받기)만 로그인**이 필요하다.

- **첫 화면:** "바로 시작하기"(주 버튼) → 이름 → 바로 내 지도 목록(혼자 쓰는 공간 자동 생성, "누구랑 그릴까요" 단계 생략). 아래에 "계정이 있다면" 카카오·Apple·이메일.
- **구현:** 게스트 = Supabase 익명 세션(`signInAnonymously`, `user.is_anonymous`). 화면에는 계정 단계가 없다.
- **로그인 시점:** 초대 만들기·코드 입력 화면에서 `LoginRequired` — 카카오/Apple 로 로그인하면 `linkIdentity` 로 **같은 사용자**에 붙어 지금까지 그린 지도가 그대로 이어진다. 설정 화면·지도 목록 안내 배너에서도 로그인할 수 있다.
- **게스트 설정:** 로그아웃 없음(지도를 잃는다). "기존 계정으로 로그인" = 지금 기기 기록을 지우고 로그인 화면으로(두 기록을 합치지 않는다). "기록 지우고 처음으로" = 계정 삭제와 같은 정리.
- **이메일 연결:** 이메일 인증이 필요해 커스텀 SMTP 이후. 지금은 카카오·Apple 만.
- **서버:** `0011_guest_invite_block.sql` — 게스트의 초대 만들기(RLS 제한 정책)·미리보기·받기를 `login required` 로 거부.
- **받은 초대 링크로 온 게스트:** 코드는 보존되고, 초대 화면에서 로그인 안내 → 로그인하면 바로 이어서 수락.
