---
title: Supabase Setup Runbook
status: active
owner: project
last_review: 2026-06-07
category: runbook
related:
  - DATABASE.md
  - ADR-002 Supabase Adoption
---
# SUPABASE_SETUP.md

# Couple Map — Supabase 프로비저닝 & Auth 런타임 검증 런북

이 문서는 Auth MVP를 실제로 동작시키기 위한 1회성 설정 절차다.
순서대로 수행하면 **로그인 → 프로필 생성 → 커플 연결**까지 실측할 수 있다.

- 단계 1~5: 사용자가 Supabase 콘솔/로컬에서 직접 수행 (계정 권한 필요)
- 단계 6~7: 로컬에서 Expo 실행 및 흐름 검증

---

## 1. Supabase 프로젝트 준비

1. https://supabase.com 로그인 → **New project**
2. 입력
   - Organization 선택
   - Project name: `couple-map` (자유)
   - Database password: 안전하게 생성·보관
   - Region: 가까운 리전(예: Northeast Asia (Seoul))
3. 생성 완료까지 1~2분 대기

---

## 2. .env 설정

1. Supabase 대시보드 → **Project Settings → API**
2. 다음 두 값을 복사
   - **Project URL** (예: `https://abcd1234.supabase.co`)
   - **anon public** 키 (`anon` / `public`)
3. 프로젝트 루트에 `.env` 생성 (`.env.example` 복사)

```
EXPO_PUBLIC_SUPABASE_URL=https://<your-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

> `.env`는 .gitignore 처리되어 있다. `service_role` 키는 클라이언트에 절대 넣지 않는다(anon 키만 사용).

---

## 3. 0001_init.sql 적용

**방법 A — SQL Editor (권장, 빠름)**

1. 대시보드 → **SQL Editor → New query**
2. `supabase/migrations/0001_init.sql` 전체 내용을 붙여넣기
3. **Run** 실행 → 오류 없이 완료되는지 확인
4. **Table Editor**에서 7개 테이블 생성 확인
   - users / couples / couple_invites / boards / places / place_memos / place_reactions

**방법 B — Supabase CLI (선택)**

```
npm i -g supabase
supabase login
supabase link --project-ref <your-ref>
supabase db push
```

> CLI는 `supabase/migrations/` 를 자동 인식한다. 둘 중 하나만 수행한다.

### 적용 확인 (SQL Editor에서)

```sql
select tablename from pg_tables where schemaname = 'public' order by tablename;
-- RLS 활성화 확인
select relname, relrowsecurity from pg_class
where relname in ('users','couples','couple_invites','boards','places','place_memos','place_reactions');
```

`relrowsecurity` 가 모두 `true` 여야 한다.

---

## 3.5 추가 마이그레이션 (0002 ~ 0011)

`0001` 이후의 마이그레이션은 **별도로 적용해야 한다**(자동 적용 아님). SQL Editor에서 순서대로 실행한다.

| 마이그레이션 | 내용 | 적용 |
| --- | --- | --- |
| `0002_solo_workspace.sql` | Solo 워크스페이스(`couples.status`에 `solo`) + `create_solo_workspace` / `accept_invite` 재정의 | 필수(앱 진입 게이팅) |
| `0003_reaction_types.sql` | `place_reactions.reaction_type` CHECK → `love/lol/nope/wow` | 필수(반응 4종) |
| `0004_map_objects.sql` | `map_objects` 테이블(스티커/노트 등) + RLS | 필수(스티커 P0) |
| `0005_couples_rls_hardening.sql` | `couples_update` 정책 제거 + `is_member_of_couple`에 status(`solo`/`active`) 조건 | 필수(보안). 재실행 안전(`if exists` / `or replace`) |
| `0006_push_notifications.sql` | `pg_net` + `push_tokens`/`push_throttle` + 장소·반응·메모·스티커 INSERT 트리거 → Expo Push API | 필수(푸시 알림). 재실행 안전 |
| `0007_push_draw_text.sql` | 그림(`draw`) 알림 문구 분리 | 필수(그림 알림). 재실행 안전 |
| `0008_invite_merge.sql` | `accept_invite` 솔로 보드 합치기 + `invite_preview` RPC(authenticated 전용) | 필수(초대 흐름 v2). 재실행 안전 |
| `0009_board_activity.sql` | `board_reads` + `mark_board_read` / `board_activity` RPC (보드 목록 새 흔적 표시) | 필수(새 흔적). 미적용이어도 목록은 동작(표시만 빠짐). 재실행 안전 |
| `0010_account_deletion.sql` | `leave_workspace` / `delete_my_account` RPC + `places`·`map_objects.created_by` NULL 허용 | 필수(출시: 앱 내 계정 삭제). 재실행 안전 |
| `0011_guest_invite_block.sql` | `is_permanent_user()` + 게스트(익명 세션) 초대 만들기 RLS 차단 + `accept_invite`·`invite_preview` 로그인 확인 | 필수(로그인 없이 시작). 재실행 안전 |

### 적용 전 상태 점검 (읽기 전용)

```sql
-- map_objects 존재 여부 (null = 0004 미적용)
select to_regclass('public.map_objects');
-- 반응 CHECK 현재 정의 (구집합이면 0003 미적용)
select pg_get_constraintdef(oid) from pg_constraint
where conname = 'place_reactions_reaction_type_check';
-- couples.status 에 solo 포함 여부 (없으면 0002 미적용)
select pg_get_constraintdef(oid) from pg_constraint
where conname = 'couples_status_check';
```

> ⚠️ `0004`는 `IF NOT EXISTS`가 없어 **중복 실행 시 실패**한다. 위 점검에서 `map_objects`가 `null`일 때만 적용한다.
> `0003` ADD CONSTRAINT 전, `select distinct reaction_type from public.place_reactions;` 로 신규 집합(`love/lol/nope/wow`) 밖 값이 없는지 확인한다(있으면 먼저 정리 필요).

### 적용 확인

```sql
select to_regclass('public.map_objects');             -- public.map_objects
select pg_get_constraintdef(oid) from pg_constraint   -- ...('love','lol','nope','wow')
where conname = 'place_reactions_reaction_type_check';
select policyname from pg_policies                    -- couples_select 만 (0005)
where schemaname = 'public' and tablename = 'couples';
```

> 참고: 테이블 존재만이라면 anon 키 + REST로도 확인된다 — `GET /rest/v1/map_objects?select=id&limit=1` 가 404(`PGRST205`)면 미적용, 200이면 적용.

---

## 4. 이메일 인증 비활성화

FLOW_AUTH.md 정책: MVP는 verify email을 사용하지 않는다(가입 즉시 세션).

1. 대시보드 → **Authentication → Providers → Email**
2. **Email** provider가 Enabled 인지 확인
3. **Confirm email** 토글을 **OFF**
   - (UI 버전에 따라 Authentication → Sign In / Up → Email 하위에 위치할 수 있음)
4. 저장

> 이 설정을 끄지 않으면 `signUp` 후 세션이 생성되지 않아 ProfileSetup으로 진행되지 않는다.

---

## 4.4 로그인 없이 시작 (게스트) — 2026-10-27

앱은 "바로 시작하기"에서 Supabase **익명 로그인**을 쓴다(화면에는 계정 단계가 없다). 같이 그리기(초대)는 그때 카카오·Apple 을 **연결**(`linkIdentity`)해 같은 사용자를 정식 계정으로 바꾼다 — 지도가 그대로 이어진다.

1. 대시보드 → **Authentication → Sign In / Providers** → **Allow anonymous sign-ins** 켜기
2. 같은 화면 → **Allow manual linking** 켜기 (게스트 → 카카오·Apple 연결에 필요)
3. 남용 대비: **Authentication → Rate Limits** 의 익명 로그인(기본 IP당 시간당 30) 확인, 출시 전 CAPTCHA(Turnstile/hCaptcha) 검토
4. `0011_guest_invite_block.sql` 적용 — 서버에서도 게스트 초대를 막는다
5. 이메일 연결(게스트 → 이메일·비밀번호)은 이메일 인증이 필요해 **커스텀 SMTP**(비즈니스 메일) 설정 뒤에 붙인다

> 정리: 익명 사용자는 자동 삭제되지 않는다. 오래 안 쓴 게스트 정리는 `delete_my_account` 와 같은 순서로 지우는 예약 작업이 필요하다(외래 키가 RESTRICT 라 auth.users 만 지우면 실패).

## 4.5 소셜 로그인 (카카오 · Apple) — 2026-10-27

앱 코드: `src/services/authService.ts` (`signInWithKakao` / `signInWithApple`), 로그인 화면 `LoginScreen`.
키·시크릿 입력은 **직접** 한다(콘솔 계정 필요). 설정 전에는 버튼을 눌러도 "아직 준비 중이에요" 안내가 뜬다.

### 공통 — 앱으로 돌아올 주소

1. 대시보드 → **Authentication → URL Configuration → Redirect URLs**
2. `couplemap://auth/callback` 추가 (카카오 로그인 후 앱으로 돌아오는 주소. `Linking.createURL('auth/callback')`)

### 카카오 (Android · iOS 모두)

1. [Kakao Developers](https://developers.kakao.com) → 내 애플리케이션 → 앱 만들기
2. **앱 설정 → 앱 → 플랫폼 키 → REST API 키** = Client ID
   - 같은 화면 **카카오 로그인 Redirect URI** 에 Supabase 콜백 `https://nmptqotnakbcorfkemvw.supabase.co/auth/v1/callback` 등록
   - **카카오 로그인 Client Secret** 코드 = Client Secret, **활성화** 켜기
3. **제품 설정 → 카카오 로그인 → 일반** 상태 **ON**
4. **동의항목**: `profile_nickname`(닉네임 → 프로필 이름 기본값), `profile_image`
   - `account_email` 은 비즈 앱만 가능 → 비즈 앱이 아니면 빼고, 아래 5에서 "이메일 없는 사용자 허용"을 켠다
5. Supabase → **Authentication → Sign In / Providers → Kakao** 켜기 → Client ID / Secret 입력
   → (이메일 동의항목이 없으면) **Allow users without an email** 켜기 → 저장
6. 확인: 개발 빌드에서 "카카오로 시작하기" → 카카오 동의 → 앱으로 돌아와 프로필 화면(닉네임이 채워짐)

> 카카오 디자인 가이드: 노란 버튼(#FEE500) + 말풍선 심볼. 지금은 글자만 — 심볼 이미지는 로고·아이콘 작업 때 공식 리소스로 넣는다.

### Apple (iOS 전용 — 카카오 같은 서드파티 로그인을 두면 App Store 심사 필수)

1. Apple Developer(유료) → Identifiers → App ID `com.couplemap.mobile` 에 **Sign in with Apple** 체크
   (app.json `ios.bundleIdentifier` · `ios.usesAppleSignIn: true` · 플러그인 `expo-apple-authentication` 반영됨 → EAS 빌드가 capability 를 맞춘다)
2. Supabase → **Authentication → Sign In / Providers → Apple** 켜기
   → **Client IDs** 에 `com.couplemap.mobile` (개발 빌드 변형 번들 ID 가 있으면 함께)
   → 네이티브 로그인만 쓰므로 Secret Key(.p8)·Services ID 는 필요 없다(웹 OAuth 용, 6개월마다 교체)
3. 확인: iPhone 개발 빌드에서 "Apple로 계속하기" → 프로필 화면(첫 로그인이면 이름이 채워짐)

> ⚠️ 번들 ID `com.couplemap.mobile` 은 가칭 기반이다. App Store 에 올린 뒤에는 바꿀 수 없으니 이름을 정하면 함께 확정한다(Android `package` 도 같음).
> ⚠️ 출시 전 남은 것: Apple 로그인 계정을 삭제할 때 Apple 토큰 해지(REST `auth/revoke`) — 서버(Edge Function)에서 해야 한다. 심사 요구사항.

---

## 5. accept_invite RPC 실행 권한 확인

커플 생성은 `accept_invite` RPC를 통해서만 이루어진다. `authenticated` 역할이 실행 가능한지 확인한다.

```sql
-- 실행 권한 확인 (true 여야 함)
select has_function_privilege('authenticated', 'public.accept_invite(text)', 'execute');
```

`false` 이면 부여:

```sql
grant execute on function public.accept_invite(text) to authenticated;
```

> 참고: `accept_invite`는 SECURITY DEFINER 함수이며, 마이그레이션을 실행한 소유자(postgres)가 테이블 소유자이므로 RLS를 우회해 `couples`를 생성한다. 별도 INSERT 정책이 없어도 정상 동작한다.

(선택) 테이블 권한 sanity 체크 — Supabase 기본 설정상 보통 자동 부여됨:

```sql
select has_table_privilege('authenticated', 'public.couple_invites', 'insert');
select has_table_privilege('authenticated', 'public.users', 'insert');
```

---

## 6. Expo 실행

1. `.env` 저장 후, **캐시를 비우고** 시작 (EXPO_PUBLIC_ 변수는 번들 시점에 주입됨)

```
npx expo start -c
```

2. 실행 방법 (택1)
   - **Expo Go** 앱(휴대폰)으로 QR 스캔 — 권장(코드 입력 흐름은 Expo Go로 충분)
   - 터미널에서 `a` (Android 에뮬레이터) / `w` (웹)

> 딥링크(`couplemap://`)와 Realtime 자동연결은 이번 검증 범위가 아니다. **초대 코드 입력 방식**으로 검증한다(별도 dev build 불필요).

---

## 7. 런타임 검증 시나리오

두 계정(초대자 A / 수락자 B)이 필요하다. 한 기기에서 순차로 진행한다.

### 7-1. 로그인/가입 + 프로필 (계정 A)

1. 앱 실행 → Splash → Login
2. "회원가입" → 이메일/비밀번호(6자+) 입력 → 가입
3. 자동으로 ProfileSetup 진입 → 닉네임 입력 → "다음"
4. CoupleConnect 화면 진입 확인 (게이팅 정상)

### 7-2. 초대 생성 (계정 A)

5. "상대 초대하기" → InviteCreate
6. **초대 코드**(예: `K7Q2 9PXM`) 기록 / "코드 복사"
7. HomePlaceholder의 "로그아웃" 또는 앱 재시작으로 A 로그아웃

### 7-3. 수락 (계정 B)

8. 계정 B로 회원가입 → 닉네임 입력
9. CoupleConnect → "초대 코드 입력" → 코드 입력 → "연결하기"
10. **"연결됐어요!" (HomePlaceholder)** 진입 확인 → 커플 연결 성공

### 7-4. 예외 확인 (선택)

- 잘못된 코드 → "유효하지 않은 초대예요."
- 본인 초대 코드 수락 → "본인 초대는 수락할 수 없어요."
- 이미 연결된 계정이 재수락 → "이미 연결된 계정이 있어요."

### 검증 완료 기준

- A: 로그인 → 프로필 → 초대 생성까지 진행
- B: 가입 → 프로필 → 코드 수락 → 연결 완료 화면 도달
- Supabase Table Editor에서 `couples` 행 1개(status=active), `couple_invites.used_at` 기록 확인

---

## 알려진 제약 / 트러블슈팅

- **앱이 즉시 throw:** `.env` 미설정. supabase.ts가 의도적으로 throw. 값 입력 후 `expo start -c` 재시작.
- **가입 후 ProfileSetup으로 안 넘어감:** 4단계(Confirm email OFF) 미적용.
- **연결하기 실패(권한 오류):** 5단계 grant 미적용 또는 마이그레이션 미적용.
- **단일 활성 커플:** 한 사람은 active 커플 1개만 가능. 재검증 시 기존 커플을 SQL로 정리하거나 새 계정 사용.
- **연결 확인 버튼:** 이번 MVP는 Realtime 자동전환 대신 수동 "연결 확인". 수락 직후 A 화면에서 눌러 전환 확인 가능(별도 기기로 동시 테스트 시).
