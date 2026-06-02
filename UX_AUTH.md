# UX_AUTH.md

# Couple Map — Auth 화면 UX/UI 설계

## Overview

이 문서는 Auth 온보딩 7개 화면의 UX/UI를 설계한다.

- 대상 화면: Splash · Login · Signup · ProfileSetup · CoupleConnect · InviteCreate · InviteJoin
- RN 코드, 컴포넌트 구현, 스타일 구현은 이 문서의 범위가 아니다.
- 시각 언어는 DESIGN.md(종이 카드 무드 · Coral/Teal · 권유형 카피)를 따른다.
- 흐름·상태·예외는 FLOW_AUTH.md를 따른다.

### 반영된 결정

1. **ProfileSetup:** 닉네임만 입력받는다. 프로필 이미지는 MVP에서 제외(Future Considerations).
2. **InviteCreate:** Realtime으로 `couples` 행 생성을 감지해 수락 즉시 자동 전환한다. ("연결되는 순간"이 핵심 경험)
3. **Login:** Google 로그인을 우선 CTA로 크게 노출. 이메일은 "다른 방법으로 시작하기" 이후 노출.
4. **CoupleConnect:** 건조한 문구 대신 서비스 톤의 권유형 카피 사용.
5. **Splash:** 단순 로딩이 아니라 데이트를 상상하게 하는 짧은 문구를 랜덤 노출.

---

## 1. 화면 목록

| # | 화면 | 한 줄 역할 |
| --- | --- | --- |
| 1 | Splash | 세션·딥링크 판별, 브랜드 첫인상 |
| 2 | Login | 기존 사용자 진입 (Google 우선) |
| 3 | Signup | 이메일 신규 가입 |
| 4 | ProfileSetup | 닉네임 설정 (users 행 생성) |
| 5 | CoupleConnect | 초대/수락 선택 허브 |
| 6 | InviteCreate | 초대 링크·코드 생성·공유·실시간 대기 |
| 7 | InviteJoin | 코드 입력 / 딥링크 수락 |

---

## 2. 사용자 행동

| 화면 | 핵심 행동 |
| --- | --- |
| Splash | (자동) 판별 대기 |
| Login | Google 선택 / "다른 방법" → 이메일 입력 / 회원가입 이동 |
| Signup | 이메일·비밀번호 입력 / 로그인 이동 |
| ProfileSetup | 닉네임 입력 |
| CoupleConnect | "초대하기" 또는 "코드 입력" 선택 |
| InviteCreate | 링크 공유 / 코드 복사 / 대기 / 초대 취소 |
| InviteJoin | 코드 입력 또는 링크 자동 수락 / 연결 확인 |

---

## 3. 화면별 목적

- **Splash:** 인증·온보딩 상태를 판별해 올바른 화면으로 분기한다. 보류된 초대 토큰을 감지한다. 짧지만 브랜드 감성을 전한다.
- **Login:** 마찰 없는 재진입. Google 단일 CTA로 단순화한다.
- **Signup:** 이메일 가입. 이메일 인증이 없어 가입 즉시 진입한다.
- **ProfileSetup:** 상대가 사용자를 식별할 최소 정보(닉네임) 확보. "두 사람" 정체성의 시작점.
- **CoupleConnect:** 혼자 쓸 수 없는 서비스의 관문. 초대/수락 두 갈래를 권유형으로 제시한다.
- **InviteCreate:** 상대를 데려오는 행동을 쉽게. 링크 + 코드 백업. 연결 순간을 실시간으로 보여준다.
- **InviteJoin:** 받은 초대를 한 번에 연결로 완성한다.

---

## 4. 와이어프레임 (텍스트)

### ① Splash

```text
        ◐◑  (겹친 핀 로고)
       Couple Map

   "이번 주말 어디 갈까?"   ← 랜덤 문구
        · · ·  (로더)
```

- 랜덤 문구 풀(예): "이번 주말 어디 갈까?" / "꽃 보러 갈까?" / "새 카페 가볼까?" / "야경 보러 갈까?"
- 로딩이 짧아도 문구를 노출해 브랜드 경험을 제공한다.

### ② Login

```text
   Couple Map
   둘이 함께 시작해요

 [  G   Google로 계속하기   ]   ← Primary (단독·크게)

   다른 방법으로 시작하기        ← 텍스트 버튼(탭 시 아래 노출)
   ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
   [ ✉  이메일로 계속하기 ]      ← 확장 후 표시
   계정이 없나요?  회원가입
```

- 초기 상태: Google 버튼만 크게. 이메일/회원가입은 "다른 방법으로 시작하기"를 누른 뒤 드러난다.

### ③ Signup

```text
 ← 회원가입
   이메일
 [ you@example.com            ]
   비밀번호
 [ ••••••••                   ]

 [    가입하고 시작하기    ]   ← Primary
   이미 계정이 있나요?  로그인
```

### ④ ProfileSetup

```text
   어떻게 불러드릴까요?

   닉네임
 [ 지민                        ]

 [        다음        ]         ← Primary (닉네임 입력 시 활성)
   상대에게 표시되는 이름이에요
```

- 프로필 이미지 입력 없음(MVP 제외).

### ⑤ CoupleConnect

```text
   함께 계획할 상대를 연결해볼까요?
   데이트는 둘이 함께 준비할 때 더 즐거워요

 [  💌  상대 초대하기   ]      ← Primary → InviteCreate
 [  🔑  초대 코드 입력  ]      ← Secondary → InviteJoin
```

### ⑥ InviteCreate

```text
 ← 상대 초대하기
   이 링크를 상대에게 보내주세요

 [ couplemap://invite?…   ]  [ 공유 ]   ← Primary(공유)

   또는 초대 코드
   ┌─────────────────┐
   │   K 7 Q 2 9 P    │   [ 복사 ]
   └─────────────────┘

   ⏳ 상대가 수락하면 바로 연결돼요   ← Realtime 대기
   ( 초대 취소 )
```

- **Realtime:** 이 화면은 `couples` 행 생성(내가 만든 초대의 수락)을 구독한다. 생성 감지 시 자동으로 연결 완료 → Home으로 전환한다.

### ⑦ InviteJoin

```text
 ← 초대 코드 입력
 [  _ _ _ _ _ _   ]   (코드 입력)

 [      연결하기      ]        ← Primary

 ── 딥링크로 진입한 경우 ──
   "지민님이 초대했어요"
 [   수락하고 연결   ]         ← Primary
```

---

## 5. 주요 CTA

| 화면 | Primary CTA | 보조 |
| --- | --- | --- |
| Splash | (없음, 자동 전환) | — |
| Login | Google로 계속하기 | 다른 방법으로 시작하기 → 이메일 / 회원가입 |
| Signup | 가입하고 시작하기 | 로그인 |
| ProfileSetup | 다음 | — |
| CoupleConnect | 상대 초대하기 | 초대 코드 입력 |
| InviteCreate | 공유 | 코드 복사 / 초대 취소 |
| InviteJoin | 연결하기 / 수락하고 연결 | — |

---

## 6. 빈 상태 (Empty)

| 화면 | 빈 상태 | 처리 |
| --- | --- | --- |
| CoupleConnect | 연결된 상대 없음 | "함께 계획할 상대를 연결해볼까요?" + 두 갈래 CTA (게이팅의 핵심 빈 상태) |
| InviteCreate | 아직 수락 전 | "상대가 수락하면 바로 연결돼요" 실시간 대기 안내 (오류 아님) |
| ProfileSetup | 닉네임 미입력 | "다음" 비활성, placeholder만 표시 |
| Splash / Login / Signup / InviteJoin | 약함 | 폼 초기값/기본 화면으로 처리 |

---

## 7. 오류 상태 (Error)

| 화면 | 오류 | 표시 |
| --- | --- | --- |
| Splash | 세션 복구 실패 | 조용히 Login으로 폴백 |
| Login | 잘못된 이메일/비밀번호 | 인라인 "이메일 또는 비밀번호를 확인해주세요" |
| Login | OAuth 취소 | 무알림, 화면 유지 |
| Signup | 이미 가입된 이메일 | 인라인 안내 + 로그인 유도 |
| ProfileSetup | 닉네임 형식/길이 오류 | 인라인 폼 검증 |
| InviteCreate | 이미 active 커플 보유 | "이미 연결된 상대가 있어요" |
| InviteJoin | invalid 토큰 | "유효하지 않은 초대예요" |
| InviteJoin | expired 토큰 | "만료된 초대예요. 새 초대를 요청해주세요" |
| InviteJoin | used 토큰 | "이미 사용된 초대예요" |
| InviteJoin | 본인 초대 수락 | "본인 초대는 수락할 수 없어요" |
| InviteJoin | 양측 중 active 커플 보유 | "이미 연결된 계정이 있어요" |
| 공통 | 네트워크 실패 | 재시도 가능한 안내(토스트) |

- 초대 수락 실패 사유는 `accept_invite` RPC 예외를 위 메시지로 매핑한다(FLOW_AUTH.md).

---

## 8. 카피 가이드 (톤)

- 권유형·구어체. 명령형 지양. ("~해볼까요?", "~해보세요")
- 짧게. 한 화면 한 메시지.
- 오류는 비난하지 않고 다음 행동을 안내한다.
- 이모지는 절제해서 포인트로만.

---

## 9. Realtime 사용 범위 (InviteCreate 한정)

- 목적: 초대자가 "연결되는 순간"을 즉시 경험.
- 범위: 내가 생성한 초대에 대응하는 `couples` 행 생성 **감지 수준**으로 제한한다.
- 복잡한 실시간 기능(프레즌스, 채팅 등)은 사용하지 않는다(ARCHITECTURE.md Realtime Scope 준수).
- 감지 시: InviteCreate → 연결 완료 → Home(BoardList)로 자동 전환.

---

## 10. Future Considerations

- **프로필 이미지:** 스토리지·권한·이미지 관리 복잡성으로 MVP 제외. 향후 ProfileSetup/프로필 편집에서 추가 검토.
- **추가 로그인 수단:** Apple 로그인 등.
- **초대 대기 알림:** 앱을 닫은 상태에서의 수락 푸시 알림(연결 순간 강화). MVP는 화면 내 Realtime으로 충분.

---

## Amendment: Solo Mode (0002)

> 이전의 "혼자 사용 불가 / 게이팅 강제" 정책은 폐기되었다. (FLOW_AUTH.md / DATABASE.md 참조)

- **CoupleConnect 개정:** 제목 "데이트를 준비해볼까요?", 설명 "혼자 먼저 계획을 만들어도 괜찮아요. 상대는 언제든 나중에 초대할 수 있어요."
  - Primary: [상대 초대하기] → InviteCreate
  - Secondary: [먼저 둘러보기] → 솔로 워크스페이스 생성 → Home
  - 보조 링크: "초대 코드를 받았나요? 코드 입력" → InviteJoin
- **솔로 → 커플 전환 유도:** Home 상단 배너(구현), Board 빈 상태 CTA(예정), Profile CTA(예정). 강제 모달은 사용하지 않는다.
