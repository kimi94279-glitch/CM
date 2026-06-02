# DATABASE.md

# Couple Map Database Design

## 1. Overview

이 문서는 Couple Map의 데이터베이스 설계를 정의한다.

- DBMS: PostgreSQL (Supabase)
- 인증: Supabase `auth.users` (관리형). 본 문서의 `users`는 **프로필 테이블**이며 `auth.users.id`를 참조한다.
- 본 문서는 설계 산출물이다. 실제 DB 생성과 SQL Migration은 별도 승인 후 진행한다.

설계 대상 테이블 (7개)

- users
- couples
- couple_invites
- boards
- places
- place_memos
- place_reactions

---

## 2. Design Principles

- **단순성 우선:** MVP 요구사항을 가장 단순하게 해결한다. 불필요한 제약·트리거·인덱스를 추가하지 않는다.
- **기록 보존 우선:** 관계 종료·탈퇴는 "삭제"가 아니라 "상태 전환"으로 처리한다. 데이트 기록은 보존한다.
- **커플 단위 격리:** 모든 데이터는 커플 단위로 격리되며 RLS로 강제한다.
- **무결성 우선 (순서):** 장소 순서는 핵심 데이터이므로 DB 제약으로 무결성을 보장한다.
- **모든 테이블은 `created_at`, `updated_at`을 포함한다.** (예외: `place_reactions`는 수정 개념이 없어 `updated_at` 없음)

---

## 3. Tables

### 3.1 users (프로필)

| 컬럼 | 타입 | 제약 |
| --- | --- | --- |
| id | uuid | PK, FK → `auth.users(id)` ON DELETE CASCADE |
| nickname | text | NOT NULL |
| profile_image | text | NULL |
| created_at | timestamptz | NOT NULL, default now() |
| updated_at | timestamptz | NOT NULL, default now() |

### 3.2 couples

| 컬럼 | 타입 | 제약 |
| --- | --- | --- |
| id | uuid | PK, default gen_random_uuid() |
| user_a_id | uuid | NOT NULL, FK → `users(id)` ON DELETE RESTRICT (생성자/초대한 사람) |
| user_b_id | uuid | **NULL 허용**, FK → `users(id)` ON DELETE RESTRICT (수락한 사람, solo면 NULL) |
| status | text | NOT NULL, default `'active'`, CHECK in (`'solo'`, `'active'`, `'ended'`) |
| ended_at | timestamptz | NULL (관계 종료 시각) |
| created_at | timestamptz | NOT NULL, default now() |
| updated_at | timestamptz | NOT NULL, default now() |

- CHECK: `user_a_id <> user_b_id` (user_b_id가 NULL이면 제약 비위반)
- **`couples`는 "1~2인 워크스페이스"다** (Solo Mode, 0002 마이그레이션):
  - `solo` = 1인 워크스페이스(`user_b_id` NULL). 커플 연결 없이 앱 사용 가능.
  - `active` = 2인 커플(`user_b_id` 채워짐).
  - `ended` = 관계 종료.
- 솔로 워크스페이스에서 만든 보드는 그 워크스페이스에 소속되며, 초대 수락 시 `active`로 **승격**되어 데이터가 그대로 유지된다.
- "초대 대기"는 `couple_invites`가 표현한다(`couples`에 pending 없음).
- 단일 워크스페이스(한 사람당 solo/active 1개) 제약은 앱 레벨(`create_solo_workspace` / `accept_invite` RPC)에서 검증한다. (9. Open Risks 참조)

### 3.3 couple_invites

| 컬럼 | 타입 | 제약 |
| --- | --- | --- |
| id | uuid | PK, default gen_random_uuid() |
| invite_token | text | NOT NULL, UNIQUE |
| created_by | uuid | NOT NULL, FK → `users(id)` ON DELETE RESTRICT (초대자) |
| expires_at | timestamptz | NOT NULL |
| used_at | timestamptz | NULL (수락 시각) |
| created_at | timestamptz | NOT NULL, default now() |
| updated_at | timestamptz | NOT NULL, default now() |

- 유효 조건: `used_at IS NULL AND expires_at > now()`
- 미수락 초대 = 아직 커플이 없는 상태. invite는 `couples`를 참조하지 않는(완전 독립) 테이블이다.
- 초대 토큰은 앱에서 안전한 난수로 생성한다. 비멤버의 수락은 `accept_invite` RPC를 통해서만 처리한다.

### 3.4 boards

| 컬럼 | 타입 | 제약 |
| --- | --- | --- |
| id | uuid | PK, default gen_random_uuid() |
| couple_id | uuid | NOT NULL, FK → `couples(id)` ON DELETE RESTRICT |
| title | text | NOT NULL |
| created_at | timestamptz | NOT NULL, default now() |
| updated_at | timestamptz | NOT NULL, default now() |

### 3.5 places

| 컬럼 | 타입 | 제약 |
| --- | --- | --- |
| id | uuid | PK, default gen_random_uuid() |
| board_id | uuid | NOT NULL, FK → `boards(id)` ON DELETE CASCADE |
| name | text | NOT NULL |
| latitude | double precision | NOT NULL |
| longitude | double precision | NOT NULL |
| provider | text | NULL, CHECK in (`'naver'`, `'manual'`) |
| provider_place_id | text | NULL |
| order_index | integer | NOT NULL, default 0 |
| created_by | uuid | NOT NULL, FK → `users(id)` ON DELETE RESTRICT |
| created_at | timestamptz | NOT NULL, default now() |
| updated_at | timestamptz | NOT NULL, default now() |

- UNIQUE `(board_id, order_index)` — 장소 순서 무결성. 재정렬은 트랜잭션 기반 일괄 처리.
- 외부 식별: `provider = 'naver'`, `provider_place_id = '12345678'`. 수기 추가는 `provider = 'manual'`, id NULL.
- 같은 장소를 여러 번 추가하는 일정(재방문)은 유효한 사용 사례이므로 장소 중복을 막는 Unique 제약은 두지 않는다.

### 3.6 place_memos

| 컬럼 | 타입 | 제약 |
| --- | --- | --- |
| id | uuid | PK, default gen_random_uuid() |
| place_id | uuid | NOT NULL, FK → `places(id)` ON DELETE CASCADE |
| user_id | uuid | NOT NULL, FK → `users(id)` ON DELETE RESTRICT |
| content | text | NOT NULL |
| created_at | timestamptz | NOT NULL, default now() |
| updated_at | timestamptz | NOT NULL, default now() |

### 3.7 place_reactions

| 컬럼 | 타입 | 제약 |
| --- | --- | --- |
| id | uuid | PK, default gen_random_uuid() |
| place_id | uuid | NOT NULL, FK → `places(id)` ON DELETE CASCADE |
| user_id | uuid | NOT NULL, FK → `users(id)` ON DELETE RESTRICT |
| reaction_type | text | NOT NULL, CHECK in (`'love'`, `'cafe'`, `'photo'`, `'mood'`) |
| created_at | timestamptz | NOT NULL, default now() |

- UNIQUE `(place_id, user_id, reaction_type)` — 같은 사람이 같은 장소에 같은 반응 중복 불가.
- 반응은 생성/삭제(토글)만 존재하므로 `updated_at`을 두지 않는다.

---

## 4. Relationships

```text
auth.users (1)──(1) users
                   │ (created_by / user_id, RESTRICT)
   ┌───────────────┼───────────────────────────────┐
   │ user_a_id / user_b_id (RESTRICT)               │
   ▼                                                │
couples                                             │
   │ (couple_id, RESTRICT)                          │
   ▼                                                │
boards ──(1:N, CASCADE)──> places ──(1:N, CASCADE)──┴──< place_memos
                              └──────(1:N, CASCADE)──────< place_reactions

couple_invites ──(N:1, RESTRICT)──> users (created_by)   // couples를 참조하지 않는 독립 테이블
```

요약

- couples 1 — N boards
- boards 1 — N places
- places 1 — N place_memos / place_reactions
- users 1 — N places(created_by) / place_memos / place_reactions / couple_invites(created_by)
- couple_invites 는 어떤 테이블의 자식도 아니며 `created_by`로만 users를 참조한다.

---

## 5. Constraints Summary

### Primary Keys

- 모든 테이블: `id uuid` (users는 `auth.users(id)`와 동일 값)

### Foreign Keys

| 테이블.컬럼 | 참조 | ON DELETE |
| --- | --- | --- |
| users.id | auth.users.id | CASCADE |
| couples.user_a_id | users.id | RESTRICT |
| couples.user_b_id | users.id | RESTRICT |
| couple_invites.created_by | users.id | RESTRICT |
| boards.couple_id | couples.id | RESTRICT |
| places.board_id | boards.id | CASCADE |
| places.created_by | users.id | RESTRICT |
| place_memos.place_id | places.id | CASCADE |
| place_memos.user_id | users.id | RESTRICT |
| place_reactions.place_id | places.id | CASCADE |
| place_reactions.user_id | users.id | RESTRICT |

### Unique

- couple_invites.invite_token
- places (board_id, order_index)
- place_reactions (place_id, user_id, reaction_type)

### Check

- couples.status in ('active', 'ended')
- couples: user_a_id <> user_b_id
- places.provider in ('naver', 'manual')
- place_reactions.reaction_type in ('love', 'cafe', 'photo', 'mood')

---

## 6. Deletion Policy

| 부모 → 자식 | 정책 | 이유 |
| --- | --- | --- |
| auth.users → users | CASCADE | 계정-프로필 1:1, 계정 삭제 시 프로필 제거 |
| users → couples (user_a/b) | RESTRICT | 한 사람의 탈퇴가 상대방 기록을 지우지 못하게 차단 |
| users → places / memos / reactions / invites | RESTRICT | 작성자 삭제가 공동 데이터를 삭제하지 못하게 차단 |
| couples → boards | RESTRICT | 관계 종료는 삭제가 아닌 status='ended'. 기록 보존 |
| boards → places | CASCADE | 보드 삭제는 사용자의 명시적 콘텐츠 삭제 행위 |
| places → place_memos | CASCADE | 메모는 장소 종속 |
| places → place_reactions | CASCADE | 반응은 장소 종속 |

### 삭제보다 상태 전환

- **관계 종료:** `couples.status = 'ended'`, `ended_at = now()`. boards/places/memos/reactions 전부 보존.
- **사용자 탈퇴:** 활성 커플이 있으면 먼저 종료(ended) 처리 후 진행. RESTRICT가 실수 삭제를 DB에서 차단한다.
- **실제 하드 삭제:** 별도 데이터 관리 정책이 수립된 경우에만 수행한다.

> ⚠️ 데이터 손실 경고: 보드 삭제(boards → places CASCADE)는 해당 보드의 장소·메모·반응을 영구 삭제한다. 앱에서 명시적 확인 UI가 필요하다.

---

## 7. RLS Policies

모든 테이블에 RLS를 활성화한다. 원칙: **본인이 속한 커플의 데이터만 접근 가능.**

### Helper / RPC (SECURITY DEFINER, 예정)

- `is_member_of_couple(c uuid)` — `auth.uid()`가 해당 워크스페이스의 user_a_id 또는 user_b_id인지 판별.
- `create_solo_workspace()` — 솔로 워크스페이스 생성 ("먼저 둘러보기").
  1. 이미 solo/active 워크스페이스가 있으면 거부 (단일 워크스페이스 검증)
  2. `couples` INSERT (user_a=본인, user_b=NULL, status='solo')
- `accept_invite(token text)` — 초대 수락 = 솔로 워크스페이스 승격. 트랜잭션 처리:
  1. 토큰 유효성 검증 (`used_at IS NULL AND expires_at > now()`), 수락자 ≠ 초대자
  2. 수락자가 active면 거부 / solo면: 보드가 있으면 거부(향후 병합), 비어있으면 제거 후 합류
  3. 초대자가 active면 거부 / solo면 그 행을 `active`로 승격(user_b 채움, **데이터 유지**) / 워크스페이스 없으면 새 active 커플 INSERT
  4. `couple_invites.used_at` 기록

### Policy Matrix

| 테이블 | SELECT | INSERT | UPDATE | DELETE |
| --- | --- | --- | --- | --- |
| users | 본인 + 파트너 | 본인(가입) | 본인 | 불가 (계정 삭제로 처리) |
| couples | 멤버 | RPC 경유 (create_solo_workspace / accept_invite) | 멤버 (ended 전환) | 불가 (ended로 대체) |
| couple_invites | created_by 본인 | created_by = 본인 | created_by 본인 | created_by 본인 |
| boards | 커플 멤버 | 커플 멤버 | 커플 멤버 | 커플 멤버 |
| places | 보드의 커플 멤버 | 커플 멤버 | 커플 멤버 (재정렬 포함) | 커플 멤버 |
| place_memos | 커플 멤버 | 커플 멤버 (작성자 = 본인) | 작성자 본인 | 작성자 본인 |
| place_reactions | 커플 멤버 | 커플 멤버 (본인) | — | 본인 |

- 비멤버는 `couple_invites`를 직접 SELECT할 수 없다. 초대 수락은 `accept_invite` RPC로만 가능하여 토큰 노출 표면을 최소화한다.
- places / memos / reactions의 권한 판별은 `place → board → couple` 경로를 따른다. 성능과 가독성을 위해 SECURITY DEFINER 헬퍼로 캡슐화한다.

---

## 8. State Machines

### couples

```text
(create_solo_workspace)        (accept_invite: 워크스페이스 없는 초대자)
        │                                  │
        ▼                                  ▼
      solo ──(accept_invite: 솔로 승격)──> active ──(관계 종료)──> ended
```

- `pending` 상태는 존재하지 않는다. 초대 대기는 couples가 아닌 couple_invites가 표현한다.
- `solo`는 1인 워크스페이스이며 보드 등 데이터를 가질 수 있다. 승격 시 데이터는 유지된다.
- `ended`는 종착 상태이며 기록은 보존된다.

### couple_invites

```text
created (used_at = NULL, expires_at = T)
   │
   ├──(수락)──────> used (used_at = now())
   │
   └──(시간 경과)──> expired (now() > expires_at, used_at = NULL)
```

- used / expired 초대는 무효로 간주한다.

---

## 9. Open Risks

- **단일 활성 커플 (앱 레벨 검증):** DB 트리거/부분 인덱스를 두지 않고 `accept_invite`에서만 검증한다. 동시 수락(race)이 밀리초 단위로 겹치면 중복 active 커플이 생길 이론적 여지가 있다. 커플 형성이 드문 일회성 이벤트라 MVP에서는 허용하며, 문제가 실측되면 부분 Unique 인덱스를 추가한다.
- **RLS 조인 성능:** 하위 테이블 권한 판별에 다단 조인이 발생한다. SECURITY DEFINER 헬퍼와 적절한 인덱스(board_id, place_id 등)로 대응한다.
- **만료 초대 정리:** 사용/만료된 `couple_invites` 행을 정리하는 배치/정책이 없다. 누적 시 정리 잡을 추가할 수 있다.
- **order_index 재정렬 동시성:** UNIQUE(board_id, order_index) 하에서 두 사람이 동시에 재정렬하면 일시적 충돌이 가능하다. 재정렬을 트랜잭션 일괄 처리하여 완화한다.

---

## 10. Future Considerations

MVP에는 포함하지 않으나 향후 검토 가능한 항목.

- **boards 아카이브:** 현재 보드 삭제는 hard delete(places CASCADE)다. 향후 보드를 삭제 대신 보관(archive)하는 기능을 추가할 수 있다. 예: `boards.archived_at timestamptz NULL` 컬럼 도입 후 목록에서 숨김 처리. 도입 시 기록 보존 원칙과 일관된다.
- **invite ↔ couple 추적:** 감사(audit)가 필요해지면 `couple_invites`에 결과 couple 참조 컬럼을 다시 추가할 수 있다. (MVP에서는 불필요하여 제거함)
- **하드 삭제 정책:** ended 커플/오래된 기록의 영구 삭제 정책(보관 기간 등)을 별도로 수립할 수 있다.
- **장소 카테고리 / 즐겨찾기 / 방문 기록:** ARCHITECTURE.md의 Future Expansion 항목과 연동.
