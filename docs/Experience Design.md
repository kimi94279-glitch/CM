---
title: 경험 설계 — "지도 앱 + 펜 자국"에서 "펼쳐 놓고 같이 그리는 종이 지도"로
status: draft
owner: project
last_review: 2026-10-31
category: product
related:
  - Direction Research
  - ADR-013 Product Philosophy
  - ADR-014 Conversation as the Core Action
  - ADR-016 Place Search Data Licensing
---
# 경험 설계 — 무엇을 빼고, 바꾸고, 더할까 (2026-10-31)

> **진행:** 1단계 구현(2026-10-31) — 빼기 4개, 압정 핀, 필통(연필·잉크·형광펜·실 자·스티커·핀 + 두 손가락 이동), 종이 꼬리표·🔍·📮·범례, 손맛(진동·핀 낙하), 지도 한 장 v1(스토리 이미지 + 공유), 펼치기 연출(보드를 그날 처음 열 때 세 폭 종이가 펴짐, 탭하면 건너뜀 — 2026-10-31). 실기기 확인 대기.

> 출발점: "지금은 너무 그냥 지도 앱 + 펜 자국이다." 제품 정의는 [[Direction Research]] — **꿈꾸고 상상하고 경로를 탐색하는 과정, 디지털이 잊게 만든 지도 경험의 복원.**
> 근거: 1시간 분석 — 지금 앱 진단 + 조사 4갈래(놀이형 캔버스·협업 패턴 / 꿈 재료 모으기·빈 지도 / 두 번째 사람 참여 의례 / 남기기·인쇄) + 경험 목업 3장면.
> 목업: `docs/design/experience-mock.html`(?scene=shelf|canvas|export), 그림 `docs/design/experience/0-scenes.jpg` — 실제 앱 아님, 커밋 제외 폴더.

---

## 0. 한 장 요약

- **왜 "지도 앱"처럼 보이나:** 첫 행동이 맨 위 **검색창**이고, 핀은 **번호**가 붙고 앱이 **회색 선으로 자동 연결**하고, **목록 시트**가 관리 화면처럼 올라오고, 그리기는 **펜 버튼 속 모드**로 숨어 있다. 구조가 구글맵 + 그리기 도구다.
- **무엇이 되어야 하나:** 지도가 **책상 위에 펼친 종이**이고, 사용자가 **필통**을 들고 연필로 상상하고 잉크로 정하고, 다 그리면 **한 장으로 접어** 남긴다.
- **빼기 4:** 자동 회색 선 · 핀 번호 · 첫 화면의 검색창 · 늘 올라오는 목록.
- **바꾸기 6:** 펜 → **연필/잉크**, 펜·스티커 모드 → **필통 + 제스처**, 반응 바 → **남는 도장 + 날아가는 이모지**, 메모 → **쪽지(출처 칩)**, 목록 → **범례**, 지도 목록 → **지도 서랍**.
- **더하기 1순위(정체성):** 실 자(거리 감) · 지도 한 장으로 접기(내보내기) · 손맛(핀 낙하·진동) · 펼치기.
- **더하기 2순위(모으기·같이):** 공유 시트로 꿈 서랍에 담기 · 몰래 3곳 고르고 같이 펼치기 · 카톡 카드 → 웹에서 톡톡(설치 없이) · 네 자리 비워 두기 · 함께 짚는 손가락.
- **절대 안 하기:** 일정표·예약·채팅·실시간 위치·매일 스트릭·점수.

---

## 1. 지금 앱 진단 — 어디가 "지도 앱"인가

| 지금 | 느낌 | 왜 문제인가 |
|---|---|---|
| 맨 위 "어디로 떠나 볼까요?" **검색창** | 구글맵·네이버 첫 화면 | 첫 행동이 "검색 → 결과 고르기"다. 꿈꾸기가 아니라 찾기로 시작한다 |
| 핀에 **1·2·3 번호** + 추가 순서대로 **회색 선 자동 연결** | 경로 플래너 | 앱이 대신 순서·동선을 정한다. "디지털이 빼앗은 것" 그 자체 |
| **목록 시트**(☰ 개수) | 저장 목록 관리 | 지도를 덮는 표. 관리 감각 |
| **펜·스티커 FAB** → 모드 진입 | 편집 툴 | 그리기가 부가 기능처럼 숨어 있고, 모드 전환이 번거롭다 |
| 반응 바: 이모지 4개 + 💬 + **카카오맵** 버튼 | SNS 반응 + 지도 앱 링크 | 표현이 정해진 4개뿐이고, 카카오맵 버튼이 "자세한 건 다른 앱에서"라고 말한다 |
| 컬러 이모지 스티커 | 메신저 | 20세기 종이 지도 화풍과 부딪힌다(조사: Inkarnate는 화풍별 도장만 쓰게 한다) |
| 지도 목록 = 카드 리스트("보드") | 폴더 | 지도가 쌓이는 감각이 없다. 다녀왔는지, 그리는 중인지 안 보인다 |
| 지도가 즉시 뜬다 | 앱 실행 | "펼치는" 의식이 없다 |
| 끝이 없다 | — | 다 그린 지도가 어디로도 가지 않는다(남기기 부재) |

이미 맞는 것: 종이 지도 바탕 3종, 사람마다 잉크, 지도에 붙는 손그림·스티커·말풍선, 장소 데이터 구조(공공 매칭·실시간 핀), 새 흔적 알림, 로그인 없이 시작.

---

## 2. 경험 원칙 (기능 판단 기준)

1. **지도는 책상 위에 펼친 종이다.** 화면의 70% 이상은 늘 지도. UI 는 종이 위에 놓인 물건(꼬리표·쪽지·필통)처럼 보인다.
2. **앱이 대신 그리지 않는다.** 선·순서·동선은 사람이 긋는다. 앱은 거리감(실 자)처럼 **상상을 돕는 정보**만 준다.
3. **연필로 꿈꾸고 잉크로 정한다.** 상상(흐린 연필)과 결정·다녀옴(잉크)이 한 지도에 겹쳐 남는다.
4. **모드 대신 손.** 도구를 들면 한 손가락은 그리기, 두 손가락은 늘 지도 이동(굿노트·Procreate 방식). 톡 = 날아가는 이모지, 길게 누르기 = 남는 도장, 핀에서 끌기 = 실. 되돌리기는 늘 엄지 자리에 한 번.
5. **남는 것과 날아가는 것을 나눈다.** 반응을 전부 저장하면 지도가 쓰레기로 덮인다(조사: FigJam 이모트·커서 채팅은 기록이 안 남아 부담 없이 쓴다). 날아가는 이모지·손가락은 휘발, 도장·선·쪽지만 남는다.
6. **일부러 삐뚤게, 바탕에 맞게.** 손그림 선·기울어진 쪽지·조금씩 다른 도장 — "아직 고칠 수 있는 초안" 신호. 도장·스티커는 바탕 화풍에 맞춘 세트.
7. **손맛.** 핀은 위에서 '퐁' 떨어지고, 스티커는 떼어 붙이고, 짧게 진동한다. 숫자 보상은 없다.
8. **혼자서도 완결, 같이는 30초.** 계획자 혼자 그려도 즐겁고 결과물이 남는다. 두 번째 사람의 첫 행동은 설치 없이 30초 안.
9. **끝은 결과물.** 다 그린 지도는 "한 장"으로 접혀 남는다(IKEA 효과는 완성했을 때만 생긴다).

---

## 3. 경험의 흐름 — 여섯 장면

| 장면 | 사용자가 느끼는 것 | 핵심 기능 |
|---|---|---|
| **① 서랍을 연다** | 내가 그린 지도들이 접혀 쌓여 있다 | 지도 서랍(접힌 지도 카드 · "그리는 중 · 지수가 방금 핀 꽂음" · "다녀옴 11.08" 도장 · 1년 전 오늘) |
| **② 펼친다** | 종이 지도를 책상에 펼치는 의식 | 펼치기 연출(하루 1번, 탭하면 건너뜀) — 타일 로딩도 가려 준다 |
| **③ 꿈 재료를 모은다** | 인스타·유튜브·블로그에서 본 곳이 지도로 흘러든다 | 공유 시트로 **꿈 서랍**에 2초 만에 담기(위치는 나중에) · 쪽지에 **출처 칩** + "왜 저장했지" 한 줄 · **동네 동그라미**(가게 몰라도 "이 근처") · 🔍 돋보기(검색) |
| **④ 같이 그려 본다** | 머리 맞대고 손가락으로 길을 따라간다 | **필통**(✋ 이동 · ✏️ 연필 · 🖋 잉크 · 🖍 형광펜 · 🧵 실 자 · 도장 · 📌 핀) · 함께 짚는 손가락 · 날아가는 이모지 |
| **⑤ 가볍게 정한다** | 투표 숙제가 아니라 놀이 | **몰래 3곳 고르고 같이 펼치기** · 네 자리 비워 두기 · (나중) 이상형 월드컵·주사위 |
| **⑥ 다녀와서 접는다** | 우리만의 종이 지도 한 장이 남는다 | 다녀온 길 **잉크로 덧그리기** · **지도 한 장으로 접기**(스토리·피드·인쇄용) · 함께 그린 사람이 **도장 찍어 완성** · (나중) 엽서·접는 미니지도 인쇄 |

여행 **중** 길 안내는 하지 않는다 — 다들 구글맵으로 간다(조사·가상 사용자 공통).

---

## 4. 기능 결정 — 빼기 · 바꾸기 · 유지 · 더하기

### 4.1 빼기

| 기능 | 대신 | 이유 |
|---|---|---|
| 자동 회색 선(추가 순서 연결) | 사람이 긋는 연필·잉크·실 | 앱이 동선을 정해 주는 건 정의와 정면으로 어긋난다 |
| 핀 번호 1·2·3 | 압정 핀(작성자 잉크 + 이모지/이니셜). 순서가 필요하면 손글씨 번호 도장을 사람이 붙인다 | 번호 = 순서 = 일정표 감각 |
| 첫 화면 맨 위 검색창 | 종이 꼬리표 제목(지도 이름·날짜·함께하는 사람) + 🔍 돋보기 도구 | 첫 행동을 "찾기"에서 "보기·그리기"로 |
| 늘 올라오는 목록 시트 | **범례**(접힌 수첩 손잡이, 왼쪽 아래) | 목록은 종이 지도의 범례로. 지도를 덮지 않는다 |

### 4.2 바꾸기

| 지금 | 바뀐 모습 | 비고 |
|---|---|---|
| 펜 1종(내 잉크 soft) | **연필**(흐린 흑연, 계획) · **잉크**(작성자 잉크, 정함·다녀옴) · **형광펜**(이 동네 좋아 — 넓은 반투명 선) | 같은 `map_objects(draw)`에 종류 속성 하나. 연필은 일부러 삐뚤게 |
| 펜·스티커 FAB + 모드 | **필통**(아래 도구 줄) + 제스처(두 손가락 = 지도 이동 항상) | 펜 모드의 "지도 잠금"을 두 손가락 이동으로 풀어 준다 |
| 반응 바(이모지 4 + 💬 + 카카오맵) | 핀을 탭하면 **쪽지**(이름·출처 칩·한 줄 메모·도장 칸). 이모지는 톡 하면 날아가고(휘발), 길게 누르면 잉크색 도장으로 남는다. 카카오맵은 쪽지 안 작은 링크 | 표현이 넓어지고 지도 앱 냄새가 빠진다 |
| 말풍선 메모 | 포스트잇·마스킹테이프 쪽지(손글씨체) | 다꾸 문법(20대에 익숙) |
| 컬러 이모지 스티커 | **바탕별 도장 세트**: 도로지도 = 관광안내 기호, 지도책 = 교과서 지도 기호, 지형도 = 판화풍. 이모지는 남기되 종이 톤 외곽 | 예정된 글꼴·이모지 리디자인과 합친다 |
| 지도 목록(카드) | **지도 서랍**(접힌 지도 표지, 상태 도장, 1년 전 오늘) | 목업 ① |
| 지도가 즉시 뜸 | **펼치기**(하루 1번) | 목업 없음 — 연출 시안 필요 |

### 4.3 유지

종이 지도 바탕 3종(설정 비교 스위치 → 나중에 지도마다 고르기) · 사람마다 잉크 · 손그림이 지리에 붙는 구조 · 스티커 world-space 크기 · 공공데이터 매칭 + 카카오 실시간 핀(ADR-016) · 새 흔적 알림 · 로그인 없이 시작.

### 4.4 더하기 (우선순위)

**1단계 — "지도 앱"에서 벗어나기 (정체성, 약 2~3주)**

| 기능 | 무엇 | 왜 지금 | 난이도 |
|---|---|---|---|
| 필통 + 연필/잉크/형광펜 | 위 4.2 | 그리기가 주인공이 된다 | 보통 — 도구 줄 UI, draw 종류 속성, 두 손가락 이동(WebView 터치 분기) |
| 자동 선·번호 빼기 + 압정 핀 | 위 4.1 | 가장 싼 정체성 변화 | 쉬움 |
| 🧵 실 자 | 핀에서 핀으로 끌거나 그린 선 길이 → "약 1.6km · 걸어서 24분" 손글씨 꼬리표("약" 필수) | 자동 경로 없이 거리감 — 철학에 정면으로 답함. 매번 쓰는 도구라 질리지 않음 | 쉬움 — WebView 안 거리 계산 |
| 종이 꼬리표 제목 + 🔍 + 범례 | 위 4.1 | 첫 화면이 지도 앱처럼 보이지 않게 | 쉬움~보통 |
| 손맛 | 핀 '퐁' 낙하·그림자, 스티커 떼어 붙이기, 진동 | 손이 계속 가게 | 쉬움 — CSS + expo-haptics(설치 필요, v56 문서 확인) |
| 지도 한 장으로 접기 v1 | 스토리 9:16 이미지: 제목 띠 · 지도 · 범례(사람별 잉크) · 날짜 소인 · 접힌 자국 · **판권란(출처, 끌 수 없음)** | 루프를 닫고, 설치 없이 퍼지고, 인쇄 수요를 본다 | 보통 — 지도 캔버스 캡처(`preserveDrawingBuffer`) + HTML 마커 합성 |

**2단계 — 모으기와 같이 (약 3~4주)**

| 기능 | 무엇 | 난이도 |
|---|---|---|
| 꿈 서랍(공유 시트로 담기) | 인스타·유튜브·네이버 블로그에서 "공유 → 갈지도" 2초. 저장: 정리한 링크·플랫폼·사용자가 확인한 제목. 꽂기는 나중에 서랍에서 지도로 끌어서 | 보통 — Expo SDK 56 `expo-sharing` 받기(실험 기능, iOS 향후 동작 보장 없음 → `expo-share-intent` 예비). 새 개발 빌드 필요 |
| 출처 칩 + "왜 저장했지" | 쪽지에 `[▶ YouTube] 제목 · 만든 사람` + 이유 칩(뷰·메뉴·분위기·데이트코스) 하나 | 쉬움. 유튜브 썸네일은 볼 때마다 불러와 바꾸지 않고 표시, 인스타는 썸네일 없이(oEmbed 정책 변경) |
| 동네 동그라미 | 정확한 가게 몰라도 "기온쯤" 동그라미 — 장소 데이터 불필요 | 쉬움 — 형광펜 고리의 한 종류 |
| 몰래 3곳 고르고 같이 펼치기 | A가 후보를 올리고 시작 → B가 하트 3개(30초) → 둘 다 끝나면 펼침 연출, 겹친 곳은 두 잉크가 섞인 색. 0개면 "취향 넓은 둘 — 각자 1곳씩 데려가기" | 보통 — picks 테이블 + RLS(펼치기 전엔 남의 것 안 보임) |
| 카톡 카드 → 웹에서 톡톡 | "OO이가 토요일 후보 7곳을 골랐어요 · 마음에 드는 곳만 톡톡, 30초(설치 X)". B는 웹에서 💗/🤔 → 둘 다 💗한 곳 바로 보여 줌 → A에게 알림. 첫 버튼은 **웹 링크**(앱 실행 버튼은 미설치자를 스토어로 보냄) | 큼 — 웹 페이지(정적 or Expo web) + 익명 로그인 + 만료 토큰 + 봇 방지. 1차는 기기 공유 창 + OG 미리보기 |
| 네 자리 비워 두기 | 점선 빈 핀 "성수 디저트는 네가!" → 상대 잉크로 채움. 한 번에 1개, 기한 없음, 안 채우면 조용히 흐려짐 | 쉬움 |
| 함께 짚는 손가락 + 날아가는 이모지 | 지도를 같이 보고 있을 때만 상대 손끝이 잉크색 점선 원으로 보이고, 톡 하면 상대 화면에 이모지가 떴다 사라짐(저장 안 함). 실제 위치가 아니라 손가락 위치 | 보통 — Supabase Realtime broadcast·presence |

**3단계 — 다녀오기와 남기기 (나중)**

다녀옴 잉크 덧그리기 연출 · 위치 도장(150m 안, 앱 연 동안만) · "도장 찍어 줘"(함께 그린 사람이 이니셜 도장을 찍어야 한 장 완성) · 인쇄 v2(엽서 세트 → 접는 미니지도 → 포스터, 일본은 편의점 인쇄) · 봉인 쪽지(날짜 잠금) · 지도 궁합 % 이모지 격자 공유 · 주사위 · 트레이싱지 Plan B · 1년 전 오늘.

**보류:** 경로 위 작은 탈것(성능), 닳는 지도(집계·성능), 보물지도 X(위치 위조), 홈 화면 위젯(네이티브), AI 링크 → 장소 자동 추출(정확도 낮고, 경쟁 앱은 Google Places 로 확인하지만 우리는 그 데이터를 저장 못 함 — 텍스트 후보 제안 정도만 나중에).

---

## 5. 두 번째 사람 — 설계 규칙

- 두 번째 사람의 **첫 행동은 30초, 설치 없이**. 보상은 그 사람이 움직여야만 열리는 것(펼침·매치).
- 알림은 라운드당 1회 + 리마인드 1회. "기다리고 있어요" 같은 죄책감 문구 금지. 매일 스트릭 금지.
- 누가 했는지 보이게(잉크) — 단, "상대 잉크가 비어 있다"를 압박으로 쓰지 않는다.
- 공유는 기본 비공개(카카오맵 즐겨찾기 85% 노출 사고).
- **핵심 지표 하나:** 지도를 만든 지 72시간 안에 두 번째 사람이 한 번 이상 행동한 비율.

---

## 6. 남기기 — 지도 한 장 설계

- **구성(90년대 도로지도 표지 문법):** 위 제목 띠(지도 이름·연도) · 지도 · 아래 범례 상자("── 지수의 잉크") · 축척 막대·방위표 · 날짜 소인 · 일련번호("제 0012 호") · 접힌 자국과 종이 결 · **판권란**("제작 하민 & 지수" + 출처).
- **형식:** 스토리 9:16(위아래 약 250px 는 인스타 UI에 가림 — 비워 둔다) · 피드 4:5 · 인쇄용 고해상도(나중, 서버 렌더).
- **흐름:** 「남기기」 → 「어떤 한 장?」(스토리·피드·인쇄 미리보기 넘기기) → 범위(핀 전부 자동 맞춤 + 손으로 조정) → 꾸미기(제목·날짜·범례·접힘 강도·도장) → (2단계) 「도장 찍어 줘」 → 접혀 나오는 연출 → 저장·인스타·카톡.
- **공유는 끝까지 무료.** Strava 가 연말 결산을 유료로 돌렸다가 반발을 샀다. 돈은 실물(인쇄)에서.
- **출처(ODbL):** 지도 옆에 openstreetmap.org/copyright 를 **읽히는 크기로**, 끌 수 없게. 인쇄물은 "© OpenStreetMap contributors (ODbL) · © OpenMapTiles · OpenFreeMap · 지형 SRTM/GMTED2010: USGS, ETOPO1: NOAA, Mapzen". 지금 `mapStyles.ts` 의 지형 표기(`Terrain © Mapzen, AWS`)는 인쇄물엔 부족 → 보강.
- **⚠ 카카오 실시간 핀 이름:** 내보낸 이미지·인쇄물에 카카오 이름이 굳어 남으면 ADR-016 의 저장·배포 금지와 부딪힐 수 있다(유료 인쇄면 더 위험). → 내보낼 땐 **사용자가 붙인 이름·메모만** 쓰고, 이름이 없는 실시간 핀은 "이름 붙이기"를 먼저 묻는다. 필요하면 데브톡 질의.
- **인쇄 현실:** 한국은 공개 주문 API 가 있는 인쇄 업체를 못 찾음(스냅스·레드프린팅·오프린트미 등 제휴 문의만). 해외 Gelato(한·일 생산), Peecho(API 무료). 일본은 후지필름 netprint(세븐일레븐, 엽서 60엔). → v2 는 소량 수동 운영으로 수요부터 확인.

---

## 7. 데이터·기술 메모 (구현 전 확인할 것)

- `map_objects(draw)`: 선 종류(연필/잉크/형광펜/실) 속성 추가 — 마이그레이션 작음.
- 도장(남는 반응): 지금 `place_reactions` 확장 vs 새 `stamps` — 지도 아무 데나 찍는 도장이면 `map_objects(stamp)`.
- 꿈 서랍: `scraps`(보드·작성자·정리한 URL·플랫폼·사용자 제목·이유 칩·꽂혔으면 place_id). 지도에 꽂기 전엔 위치 없음.
- 몰래 고르기: `pick_rounds` + `picks` + RLS(라운드가 펼쳐지기 전엔 남의 pick 안 보임) + 마지막 제출 트리거.
- 실시간(손가락·날아가는 이모지): Supabase Realtime broadcast — DB 에 안 씀.
- 진동: `expo-haptics` 미설치. 공유 받기: `expo-sharing`(SDK 56, 실험). 둘 다 새 개발 빌드. **Expo v56 문서로 API 이름을 다시 확인한 뒤 구현.**
- 두 손가락 = 지도 이동, 한 손가락 = 그리기: 지금 펜 모드는 지도 제스처를 통째로 끈다 → 펜 캔버스가 터치 수를 보고 2점 이상이면 지도에 넘기는 구조로.

---

## 8. 결정이 필요한 것

1. 빼기 4개(자동 선·번호·첫 화면 검색창·목록 시트)를 1단계에서 바로 뺄까?
2. 펜 모드를 "필통 + 두 손가락 이동"으로 바꿀까? (그리기 경험의 핵심 변화)
3. 2단계 중 먼저: **꿈 서랍(모으기)** vs **몰래 3곳·카톡 웹(같이)**?
4. 컬러 이모지 → 바탕별 도장 세트로 갈지(이모지 리디자인과 합칠지).
5. "지도별 여러 명 공유"(구조 변경)를 2단계 앞/뒤 어디에 둘지 — 몰래 고르기·카톡 웹은 둘 이상 구조와 맞물린다.

---

## 출처 (이번 분석 추가분 — 방향 조사 출처는 [[Direction Research]])

- 놀이형 캔버스: [FigJam 도장·이모트·하이파이브](https://help.figma.com/hc/en-us/articles/1500004290981), [FigJam 커서 채팅](https://www.figma.com/blog/talk-it-out-in-figma-and-figjam/), [Freeform 협업](https://support.apple.com/guide/freeform/frfm4e6e2c9a6), [tldraw 메모지](https://tldraw.dev/blog/release-notes-20240418), [rough 스타일](https://www.drawio.com/blog/rough-style), [손맛(juice)](https://roblog.co.uk/2024/03/juicy-games/), [Zenly](https://techcrunch.com/2022/04/22/how-zenly-made-social-maps-cool-again-and-whats-next), [Mini Motorways](https://www.thumbsticks.com/hustle-and-bustle-how-mini-motorways-built-its-wuselfaktor/), [Mini Motorways 터치 불만](https://mobilesyrup.com/2021/08/22/mini-motorways-game-review-traffic-fun/), [Townscaper](https://www.nintendolife.com/news/2021/03/townscaper_is_an_idyllic_toy-like_game_thatll_melt_all_your_worries_away), [Pikmin Bloom](https://en.wikipedia.org/wiki/Pikmin_Bloom), [Inkarnate](https://dungeongoblin.com/blog/inkarnate-pro-review-2021)
- 모으기: [해외여행 탐색 채널(컨슈머인사이트)](https://www.hankyung.com/article/202602279687g), [국내 목적지 결정](https://biz.heraldcorp.com/article/10470872), [구글 스크린샷 목록](https://chromeunboxed.com/google-maps-is-using-gemini-to-turn-your-screenshots-into-plans/), [링크→핀 앱들](https://triply.au/blog/best-apps-save-travel-places-instagram-tiktok/), [정확도 문제](https://www.places.is/guides/best-apps-to-save-places-from-tiktok-and-instagram), [Mindtrip](https://techcrunch.com/2024/07/31/travel-startup-mindtrips-new-feature-lets-you-build-an-itinerary-from-a-screenshot-youtube-or-tiktok-video), [인스타 oEmbed 변경](https://developers.facebook.com/blog/post/2025/04/08/oembed-updates/), [유튜브 개발자 정책](https://developers.google.com/youtube/terms/developer-policies), [Expo SDK 56 sharing](https://docs.expo.dev/versions/v56.0.0/sdk/sharing/), [expo-share-intent](https://npmjs.com/package/expo-share-intent), [Pinterest 온보딩](https://goodux.appcues.com/blog/pinterests-value-driven-onboarding-flow), [Polarsteps 가이드](https://www.polarsteps.com/news/polarsteps-launches-new-feature-for-inspired-travel-planning-polarsteps-guides)
- 두 번째 사람: [Paired](https://paired.com/articles/5-ways-this-new-app-helps-couples-have-essential-conversations), [듀오링고 친구 스트릭](https://blog.duolingo.com/product-lessons-friend-streak/), [Partiful](https://kristenberman.substack.com/p/3-ways-partiful-is-beating-eventbrite), [Wordle](https://www.smithsonianmag.com/smart-news/heres-why-the-word-game-wordle-went-viral-180979439/), [구글 지도 그룹 플래닝(2018)](https://blog.google/products/maps/all-together-now-group-planning-google-maps/), [사회적 태만](https://www.simplypsychology.org/social-loafing.html), [카카오톡 공유](https://developers.kakao.com/docs/ko/kakaotalk-share/common), [Supabase 익명 로그인](https://supabase.com/docs/guides/auth/auth-anonymous)
- 남기기: [Spotify Wrapped 2025](https://www.musicbusinessworldwide.com/spotify-wrapped-campaign-hit-200m-engaged-users-in-24-hours-a-19-yoy-increase), [Strava 결산 유료화 반발](https://road.cc/content/news/strava-year-sport-now-only-subscribers-317425), [Polarsteps 책 가격](https://support.polarsteps.com/hc/en-us/articles/24003935464466-What-is-the-price-of-a-Travel-Book), [후지필름 netprint 연동](https://www.fujifilm.com/fb/ja/solutions/wide-variety/multicopy/service-collaboration), [Gelato](https://www.gelato.com/products), [Peecho](https://support.peecho.com/hc/en-us/articles/8021909213980), [OSM 출처 지침](https://osmfoundation.org/wiki/Licence/Attribution_Guidelines), [OpenMapTiles 출처](https://openmaptiles.org/docs/terminology/attribution/), [지형 타일 출처](https://github.com/tilezen/joerd/blob/master/docs/attribution.md), [출처 누락 지적 사례](https://community.openstreetmap.org/t/printapoint-does-not-include-required-osm-attribution/142933)
