---
title: 방향 조사 — 잊힌 지도 경험의 복원
status: draft
owner: project
last_review: 2026-10-31
category: product
related:
  - ADR-013 Product Philosophy
  - ADR-014 Conversation as the Core Action
  - ADR-016 Place Search Data Licensing
---
# 방향 조사 — 잊힌 지도 경험의 복원 (2026-10-31)

> 출발점(사용자 말): **"개인이나 친구·연인이 지도 위에서 꿈꾸고 상상하고 경로를 탐색하는 과정을 만들어 준다. 아날로그 시대엔 당연했지만 디지털이 되면서 잊힌 걸 다시 경험하게 해 준다."**
> 조사 방법: 30분 동안 다섯 갈래를 동시에 돌림 — ① 해외 레퍼런스 ② 한국·일본 문화와 앱 ③ 아날로그를 디지털로 옮긴 설계 패턴·기능 아이디어 ④ 트렌드·수익 모델 근거 ⑤ 가상 사용자 반응(시뮬레이션 — **실제 조사 아님**).
> 표기: [2차] 언론·블로그 재인용 · [미검증] 출처 하나·불명확 · [시뮬] 가상 페르소나.

---

## 0. 한 장 요약

1. **빈자리는 있다.** 트리플은 11월 3일 끝나고 NOL(예약)로 흡수되고, Felt(함께 그리는 지도)는 기업용으로 떠났고, 구글·애플 지도는 "목록"까지만 한다. **예약 없이 같이 꿈꾸는 지도**는 비어 있다. 일본에도 지도형 커플·친구 앱이 없다.
2. **근거는 있다.** 여행은 떠나기 전이 가장 행복하고(휴가 전 행복도 상승, 다녀온 뒤엔 차이 없음), 지도를 보며 길을 찾는 사람이 내비를 따라간 사람보다 공간을 더 잘 기억하고, 손으로 그린 건 더 오래 기억한다. "꿈꾸는 단계"를 제품으로 만드는 건 근거 있는 방향이다. (단 "뇌 건강"을 홍보에 쓰면 안 된다 — 표본이 작다.)
3. **돈은 '계획'이 아니라 '기념'에서 나온다.** Polarsteps는 마케팅 없이 사용자 2천만 명까지 갔고 오랫동안 매출 전부가 인쇄 여행책이었다. 가상 사용자들도 앱 구독엔 0원, **"우리가 그린 지도 한 장"을 엽서·포스터로 받는 데엔** 2~5만 원을 말했다 [시뮬]. 종이 지도 정체성과 바로 이어진다.
4. **가장 큰 위험은 "두 번째 사람이 안 들어온다"다.** 그룹 여행의 74%는 1~2명이 계획을 다 하고(계획자의 82.5%가 부담을 느낌) [2차], 여행 하나를 성사시키는 데 메시지 83개·11일이 든다 [2차]. 같이 쓰는 지도가 한 사람의 예쁜 저장함이 되면 단톡방을 못 이긴다.
5. **무게중심은 여행 전(꿈)과 여행 후(기념)다.** 여행 중엔 모두 구글맵·네이버로 돌아간다. 길찾기로 싸우지 않는다.
6. **감성 형식은 금방 베껴지고 닳는다.** 인생네컷 과포화, BeReal 사용자 반 토막, Dispo 흔들림. 해자는 **그 사람들이 쌓은 기록**과 **기능을 실은 아날로그**(예: 실 = 거리 재기)다. 장식만 하는 아날로그(애플 Find My Friends 가죽 바느질)는 조롱받고 사라졌다.
7. **일본 웨지는 숫자로 확실하다.** 방일 한국인 2025년 946만(국적 1위), 2026년 1,000만 돌파 유력 [추정]. 네이버·카카오는 국경에서 끊기고 구글맵 저장은 같은 모양 핀이 쌓여 엉망이 된다. 일본은 **종이로 뽑는 수요**(旅のしおり, tabiori 편의점 인쇄)와 **스티커북 붐**이 강하다.

---

## 1. 우리 말 vs 사용자 말

창업자 문장("꿈꾸고 상상하고 경로를 탐색하는 과정")은 방향으로는 정확하지만, 가상 사용자 넷 중 누구도 자기 고민을 이렇게 말하지 않았다 [시뮬]. 20~30대에게 "아날로그 지도의 추억"은 도로지도보다 **사회과부도·지하철 노선도** 정도이고, 효율파(24세)는 "해 본 적이 없어서 그립지도 않다"고 했다.

→ 안에서는 이 문장을 헌법으로 쓰고, 밖(앱스토어·광고)에서는 **장면**으로 말한다. 초안:

- "여행 가기 전, 같이 지도 펼쳐 놓고 그려 보는 앱. 다녀오면 우리만의 종이 지도 한 장이 남아요."
- "단톡방에 쌓인 링크 말고, 지도 한 장에 같이 그려요."
- "길 안내는 구글맵이 해요. 우리는 어디 갈지 꿈꾸는 시간을 만들어요."

---

## 2. 레퍼런스 — 가장 관련 높은 것

| 레퍼런스 | 무엇 | 우리에게 주는 교훈 |
|---|---|---|
| **Felt** (미국) | 마커·형광펜으로 지도를 스케치 종이처럼 쓰는 협업 지도. 친구 여행 동선 그리기에도 쓰였다 | 함께 그리는 인터랙션이 우리와 가장 닮았는데 소비자 수익 모델을 못 찾고 GIS 기업용(Team $199/월)으로 떠났다. **소비자 수익 모델을 처음부터** 설계해야 한다 |
| **Polarsteps** (네덜란드) | 여행을 지도 발자취로 남기고 인쇄 여행책으로 판다. 사용자 2천만, 마케팅 0원(8년). 2026년 Plus(연 €29.99)에 **지도 스타일**이 유료 항목 | 가장 직접적인 본보기. 지도 위 추억 → 실물. **지도 스타일 자체도 팔린다** |
| **Strava** 경로·GPS 아트 | 운동 앱인데 사람들이 지도를 캔버스 삼아 그림을 그린다 | 지도에 손으로 그리는 즐거움은 저절로 문화가 된다. 손그림 경로는 자랑하고 싶어진다 |
| **Zenly → Bump** | 장난스러운 친구 지도. MAU 3,500만에도 Snap이 종료(2023) | 따뜻하고 유치한 지도는 사랑받는다. 그리고 **수익이 없으면 사라진다** |
| **Mapiful·Etsy 손그림 지도** | "우리가 만난 곳" 지도 포스터(€45~80), 커플 선물 | 커플은 의미 있는 장소의 지도를 돈 주고 산다 → 보드를 포스터로 뽑아 주는 출구 |
| **트리플 → NOL**, 마이리얼트립 | 일정판이 예약 통로가 됨. 트리플 11월 3일 종료 | 한국 여행 계획 앱은 예약 쪽으로 갔다. 우리는 **일정 관리 앱으로 보이면 안 된다** |
| **썸원** (한국) | 하루 질문 하나에 둘 다 답해야 상대 답이 열림. 매일 100만 명(자체 발표) | **"둘 다 해야 열리는" 의례**가 두 번째 사람을 붙잡는다 |
| **비트윈** | 누적 2,600만 다운로드, 절반 이상 해외. 메시지는 카톡에 짐 | 채팅을 만들지 말고 **지도 위 반응**에 집중 |
| **旅のしおり · tabiori** (일본) | 손수 만드는 여행 책자, 같이 만드는 과정이 추억. tabiori는 공동 편집 + 편의점 인쇄, 리뷰가 지도 위 경로를 요청 | 일본은 **종이 출력 수요가 확실하고 지도 중심 시오리는 비어 있다** |
| **Gudak·Slowly·Huji** | 24장 한 롤·3일 현상, 거리만큼 늦게 오는 편지, 무작위 빛샘 | 제약·지연·흠이 무게를 만든다. 단 **기다림 자체가 내용일 때만** |
| **Inkarnate** | 그림 실력 없어도 예쁜 판타지 지도가 나오는 스탬프·브러시 | 못 그려도 예쁘게 나오게 하는 장치가 핵심 |
| **Stamen Watercolor** (Stadia, MapLibre) | 수채·종이 질감 지도 타일 | 우리 종이 지도 바탕의 기술 선례 |
| 기준선: **구글 지도 목록** | 이모지 아이콘·공동 편집 목록·반응(2023) | 핀·이모지·공유 목록만으로는 차별화 안 됨. **종이 바탕 + 손그림**이어야 한다 |

---

## 3. 감정의 근거 (연구)

- 길 찾기: GPS 사용자가 종이 지도 사용자보다 실수 많고 느렸고, 다녀온 뒤 약도도 덜 정확했다(Ishikawa 2008 [2차 요약]). 지도를 본 사람은 동네 전체 배치까지 익혔다(Münzer 2006). 내비 지시를 따를 땐 해마 활동이 늘지 않았다(Javadi 2017, 24명).
- 기대: 다가올 일을 떠올릴 때 감정이 더 강하다(Van Boven & Ashworth 2007). 휴가 가는 사람은 **떠나기 전에만** 더 행복했다(Nawijn 2010, 1,530명).
- 손: 그린 단어는 쓴 단어보다 두 배 가까이 잘 기억난다(Wammes 2016). 직접 만든 걸 더 아낀다 — 단 완성했을 때(IKEA 효과).

→ "자동 경로 없음 · 지도 전체 보여 주기 · 직접 그리기 · 완성품으로 끝내기"는 연구와 맞는다. 홍보에 "뇌 건강"은 쓰지 않는다.

---

## 4. 방향 제안

### 4.1 루프: 꿈꾸기 → 다녀오기 → 남기기

| 단계 | 사용자가 하는 일 | 우리가 주는 것 |
|---|---|---|
| **꿈꾸기** (여행·데이트 전) | 지도를 펼치고, 핀을 꽂고, 손가락으로 길을 따라가고, 낙서한다 | 종이 지도 바탕(완료), 핀·반응·메모·스티커·펜(완료), **실 자**(거리 감), **연필 선** |
| **다녀오기** (중) | 길 안내는 구글맵 | 경쟁하지 않는다. 다녀온 곳에 **잉크로 덧그리기**, (나중) 도장 |
| **남기기** (후) | 우리가 그린 지도를 남기고 자랑한다 | **지도 한 장 내보내기**(스토리 이미지·엽서) → 인쇄(포스터·지도책) |

지금 앱은 "꿈꾸기"만 있다. 조사로 보면 입소문과 돈은 "남기기"에서 나온다. **루프를 닫는 게 다음 일**이다.

### 4.2 두 번째 사람 문제에 대한 설계 원칙

- **혼자서도 완결되는 가치**: 계획자 한 명이 혼자 그려도 즐겁고, 결과물(지도 한 장)이 남아야 한다. "같이"는 보너스.
- **참여 문턱 낮추기**: 초대받은 사람은 반응(❤️·말풍선) 하나로 참여 완료. (아이디어: 앱 설치 없이 링크로 보고 반응 — 웹 뷰어가 필요해 작업 큼, 나중 검토.)
- **둘 다 해야 열리는 의례**(썸원): 예) 같은 곳에 둘 다 핀을 꽂으면 스티커가 열림, 둘 다 다녀온 곳에 도장.
- **공유 기본 비공개**: 카카오맵 즐겨찾기 85% 노출 사고(2021) — 공개는 사용자가 직접 고른다.

### 4.3 하지 않는 것 (재확인)

일정표·시간표 / 예약 / 메신저(채팅) / 실시간 위치 공유 / 자동 동선 최적화.
**재검토 필요:** 핀을 순서대로 잇는 자동 회색 선(앱이 대신 그려 주는 것) — 이번 조사로 보면 "연필 선(사용자가 그림)"으로 대체하는 쪽이 정의에 맞다.

### 4.4 수익 (조사 기준 순위)

1. **지도 실물 프린트** — 엽서·포스터·작은 지도책. 주문형 인쇄로 작게 시작. 근거: Polarsteps, Mapiful(€45~80), 가상 사용자 반응, 일본 인쇄 문화.
2. **스티커 팩·지도 테마 단건** — 카카오 이모티콘·LINE 스탬프처럼 한·일 사용자는 낱개 디지털 아이템을 산다. 기본 3종 바탕은 무료, 추가 테마 유료(Polarsteps도 지도 스타일을 유료로 판다).
3. **연간 구독(나중)** — 연 3~4만 원대, 테마 전체 + 프린트 할인 + 고해상도. 여행은 빈도가 낮아 유지율이 약점(Polarsteps도 10년 차에야 구독).
- 예약 제휴 수수료는 "관리가 아니라 표현"과 충돌 → 하지 않는다.

---

## 5. 기능 후보 (우선순위)

| 순위 | 기능 | 아날로그 원형 → 디지털 | 왜 | 난이도 |
|---|---|---|---|---|
| 1 | **지도 한 장 내보내기** | 엽서 | 루프를 닫고, 설치 없이 퍼지고(이미지), 돈(인쇄) 검증까지 | 보통 — 지도 캔버스 캡처(`preserveDrawingBuffer`) + 핀·말풍선(HTML) 합성, 출처 표기 필수 |
| 2 | **실 자** | 지도에 실을 대 거리 재기 | "자동 경로 없이도 거리감" — 철학에 정면으로 답함. 매번 쓰는 도구라 질리지 않음 | 쉬움 — 그린 선·두 핀 거리, "약 2.3km · 걸어서 35분" |
| 3 | **연필 → 잉크** | 연필로 계획, 펜으로 확정 | 꿈(연필)과 다녀온 길(잉크)을 한 지도에. 자동 회색 선의 대안 | 쉬움 — 선 속성 하나 |
| 4 | **펼치기** | 지도를 펼치는 손동작 | 열 때마다 작은 의식 + 타일 로딩 가림. 하루 한 번만, 탭하면 건너뜀 | 보통 |
| 5 | **핀에 출처 링크** | 가이드북 여백 메모 | "유튜브·블로그에서 본 곳"이 한눈에 — 구글맵 저장이 엉망이 되는 지점(일본 여행 개발자 사례) | 쉬움 |
| 6 | 손글씨 이름표 | 지도에 손으로 쓴 이름 | 그 사람의 글씨 = 그 사람의 존재 | 쉬움~보통 (폰트 용량) |
| 나중 | 함께 짚는 손가락, 도장 수첩, 가본 곳 색칠(経県値·색칠 지도), 트레이싱지 Plan B, 봉인 엽서, 보물지도 X, 닳는 지도 | | | 보통~어려움 |

---

## 6. 싸게 검증하기 (만들기 전에)

1. **인터뷰 5~8명**(계획 안 하는 쪽 파트너 꼭 포함) — 과거 행동만 묻는다:
   - "가장 최근 여행·데이트를 계획할 때, 처음 얘기가 나온 순간부터 출발까지 실제로 뭘 열었는지 폰을 보면서 순서대로 보여 줄 수 있어요? 같이 간 사람은 그동안 뭘 했어요?"
   - "지난 한 달 동안 갈 계획 없이 그냥 지도를 보거나 가고 싶은 곳을 모아 본 적 있어요? 언제, 무엇으로, 얼마나 오래요?"
   - "다녀온 뒤에 동선이나 장소를 어딘가에 남긴 적 있어요? 무엇으로 만들었고, 시간·돈은 얼마나 들었어요?"
2. **컨시어지 테스트** — 몇 팀의 지난 여행·데이트 동선을 지금 앱의 종이 지도 스타일 이미지로 직접 만들어 주고, ① 그 이미지를 스스로 공유하는지 ② 엽서·포스터 인쇄에 돈을 내는지 본다.
3. 출시 후 볼 숫자: **두 번째 사람 참여율**(초대받은 사람이 반응·핀을 하나라도 남기는 비율), **내보내기 공유율**.

---

## 7. 이름 (Couple Map 은 더 이상 맞지 않음 — 방향만)

- **갈지도** — "갈 지도(갈 곳을 그린 지도)" + "갈지도 몰라(꿈꾸는 중)". 두 뜻이 다 제품이다.
- **펼친지도 / 펼침** — 지도를 펼치는 의식.
- **지도 한 장** — 결과물(남기기)을 이름으로.
- 영어·일본 겸용 후보: **Unfold**, **Fold**, **Atlas**(흔함).
- ※ 모두 상표·앱스토어 중복 확인 전. 정할 때 `brand-and-naming` 으로 따로 검토.

---

## 8. 열린 질문 (결정 필요)

1. 자동 회색 선 → 연필 선으로 대체할까?
2. 다음 구현: **지도 한 장 내보내기**(루프 닫기·검증) vs **지도별 여러 명 공유**(구조 변경) — 무엇이 먼저?
3. 인쇄 파트너(주문형 인쇄) 조사 시점.
4. ADR-014(핵심 행동 = 대화)를 "혼자 꿈꾸기"까지 넓힐지 — ADR-017(방향)에서 같이 정리.

---

## 출처 (주요)

- 트리플 종료·NOL 통합: [App Store](https://apps.apple.com/kr/app/id1225499481), [NOL 일정](https://www.youthdaily.co.kr/mobile/article.html?no=194154)
- Felt: [가격](https://felt.com/pricing), [시리즈A](https://www.felt.com/blog/public-beta-15m-series-a), [기업용 전환](https://businesswire.com/news/home/20240716372338/en/Felt-3.0-Brings-Intuitive-Geospatial-Technology-to-the-Enterprise/)
- Polarsteps: [2천만 사용자](https://www.polarsteps.com/news/20-million-travelers-and-counting-tech-success-story-polarsteps-celebrates-its-fast-growing-community), [Plus](https://www.polarsteps.com/stories/introducing-polarsteps-plus), [인쇄 매출](https://peecho.com/case-studies/polarsteps)
- Mapiful: [mapiful.com](https://www.mapiful.com/) · Zenly 종료: [TechCrunch](https://techcrunch.com/2022/12/05/zenly-was-the-best-social-app-and-it-will-sadly-shut-down-on-february-3rd/)
- Strava: [Route Builder](https://runningmagazine.ca/?p=59349), [기업가치](https://sacra.com/c/strava/)
- 구글 지도 목록 업데이트: [Google](https://blog.google/products/maps/google-maps-updates-november-2023/)
- Stamen Watercolor: [Stadia Maps](https://docs.stadiamaps.com/map-styles/stamen-watercolor/)
- 연구: [Ishikawa 2008 요약](https://www.bps.org.uk/research-digest/dont-ditch-your-paper-maps-just-yet), [Münzer 2006](https://madoc.bib.uni-mannheim.de/70980/), [Javadi 2017](https://www.ucl.ac.uk/news/2017/mar/satnavs-switch-parts-brain), [Dahmani & Bohbot 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7156656/), [Van Boven & Ashworth 2007](https://pubmed.ncbi.nlm.nih.gov/17500652/), [Nawijn 2010](https://pmc.ncbi.nlm.nih.gov/articles/PMC2837207/), [Wammes 2016](https://uwspace.uwaterloo.ca/items/a8b52734-18f3-4527-8be2-008a105c85f2), [IKEA 효과](https://dash.harvard.edu/handle/1/12136084)
- 아날로그 앱: [Gudak](https://petapixel.com/2017/07/13/gudak-brings-joy-pain-film-photography-phone/), [Slowly](https://help.slowly.app/hc/en-us/articles/115001835772-When-will-my-penpal-receive-my-letter), [BeReal](https://petapixel.com/2023/02/22/bereal-may-be-on-the-out-users-have-nearly-halved-since-peak), [Find My Friends 가죽](https://www.macworld.com/article/222406/find-my-friends-ditches-stitched-leather-in-ios-7-update.html)
- 트렌드: [인스탁스 FY2025](https://www.fujifilm.com/is/en/news/hq/14128), [미국 바이닐 2025](https://www.musicweek.com/labels/read/riaa-us-revenue-hits-record-high-as-vinyl-sales-pass-1-billion/093770), [Expedia 계획 여정](https://www.expedia.com/newsroom/eg-path-to-purchase-research), [스카이스캐너 그룹 여행 [2차]](https://biz.heraldcorp.com/article/10779087), [Talker Research [2차]](https://www.hotel-online.com/news/planning-a-trip-women-say-theyre-doing-almost-all-the-work), [RevenueCat 2025](https://www.revenuecat.com/state-of-subscription-apps-2025)
- 한국: [카카오맵 즐겨찾기 노출](https://www.inews24.com/view/1454458), [비트윈](https://view.asiae.co.kr/article/2018071707025962957), [썸원 [자체]](https://eopla.net/magazines/15776), [29CM 문구 [2차]](https://www.hankyung.com/article/202502179621i), [인생네컷 매장 감소](https://www.bizhankook.com/bk/article/29706), [일본 여행 개발자 사례](https://news.hada.io/topic?id=28043), [해외여행 계획 방식(오픈서베이)](https://blog.opensurvey.co.kr/article/overseas-travel-2025-2/)
- 일본: [旅のしおり](https://co-trip.jp/article/46526), [tabiori](https://apps.apple.com/JP/app/id1193502519), [NAVITIME 인쇄](https://www.travelvoice.jp/20210511-148702), [스티커북 붐](https://president.jp/articles/-/111281), [방일 한국인 2025](https://www.heraldk.com/article/2026012104453209138), [JNTO 2025-12](https://asset.japan.travel/image/upload/v1769050010/pdf/Number_of_visitor_arrivals_to_Japan_in_December_2025.pdf), [2026-09](https://www.travelvoice.jp/english/international-arrivals-in-japan-in-september-2026-were-down-5-0-to-3-1-million-yoy-reduction-for-two-consecutive-months)
- 카카오 이모티콘 [2차](https://v.daum.net/v/20250530144051820), LINE 스탬프 [자체](https://www.lycorp.co.jp/news/archive/L/ja/ja20210506_A.pdf)
