# Current State

## 완료

- Place Reaction MVP
- reaction overlay
- map_objects 도입
- Sticker P0 구현
- 작성자 구분(사람마다 잉크 — B+ 디자인: 핀·반응 칩·스티커 외곽선·목록·범례)
- 한 줄 메모(핀 말풍선, place_memos 사용)
- 푸시 알림(0006 트리거 → Expo Push, 탭 시 그 핀으로 이동) — DB 적용 완료, 자격 증명·개발 빌드 대기
- 펜 그리기(Draw): 펜 모드(지도 잠금) → 손가락 선 → 단순화·지도 좌표 → map_objects(draw), 내 잉크 soft 색·world-space 굵기, 선 탭 선택·굵기·삭제, 되돌리기
- 초대 흐름 v2(코드 완료 · 웹 페이지 배포 완료 2026-10-26 https://kimi94279-glitch.github.io/CM/invite/ · 0008 DB 적용 완료 — 실기기 확인 대기): 웹 초대 페이지(web/invite, 앱 없어도 열림) · 로그인 전 받은 코드 보존(48시간) · 솔로 데이터 합치기 · 수락 전 미리보기 · "같이 그릴 사람" 문구 (FLOW_AUTH.md Amendment 2026-10-26)
- 새 흔적 표시(코드 완료 · 0009 DB 적용 완료 2026-10-27 — 실기기 확인 대기): 보드 목록에 상대가 내가 본 뒤 남긴 흔적 수(상대 잉크 점) · 마지막 흔적 시각 · 최근 활동순 정렬. 보드에 들어올 때·나갈 때 읽음 기록, 푸시 수신 시 갱신
- 계정 삭제·연결 끊기(코드 완료 · 0010 DB 적용 완료 2026-10-27 — 실기기 확인 대기): 설정 화면(목록·첫 화면에서 진입) — 이름·이메일, 같이 그리는 사람, 연결 끊기(지도는 남는 사람에게), 로그아웃, 계정 삭제(혼자 쓰던 지도는 삭제 / 함께 쓰던 지도는 상대에게 남고 내 메모·반응 삭제, 장소·그림은 "떠난 사람"으로). 다른 사람으로 로그인하면 이전 캐시 비움
- 카카오·Apple 로그인(코드 완료 — 콘솔 설정·새 개발 빌드 대기): 카카오 = 브라우저 인증 세션 + PKCE code 교환(모든 기기), Apple = iOS 네이티브 ID 토큰 + nonce. 로그인 화면은 카카오 → Apple(iOS) → "이메일로 로그인"(접힘). 소셜 이름으로 프로필 닉네임 기본값. app.json ios.bundleIdentifier `com.couplemap.mobile`·usesAppleSignIn, 플러그인 expo-apple-authentication·expo-web-browser. 설정 절차 SUPABASE_SETUP.md §4.5
- 지도 안정성(2026-10-27): MapLibre GL JS 5.24.0 을 앱 안에 넣음(CDN unpkg 의존 제거 — `npm run vendor:maplibre` 가 src/components/vendor/maplibreAssets.ts 생성, 버전 고정). 스타일 로드 실패(오프라인·서버 장애, 4초 확인)·30초 타임아웃·SDK 오류 → "지도를 불러오지 못했어요 · 다시 시도" 화면(WebView 새로 띄움), WebView 프로세스 종료는 1회 자동 재시작. 늦게라도 뜨면 실패 화면 자동 해제. 브라우저 검증: 인라인 로드·unpkg 요청 0·ready·핀 2개 표시 / 잘못된 스타일 URL → fatal:style. Android export 번들 5.4MB 정상
- 오류 처리(2026-10-27): 앱 전체 오류 경계(AppErrorBoundary — 하얀 화면 대신 "다시 시도"), 지도 화면 알림의 DB 원문 오류 → 쉬운 문구(utils/errors friendlyError). 오류 수집(Sentry)은 계정·DSN 필요 → 대기
- 로그인 없이 시작(코드 완료 · Supabase 익명 로그인·수동 연결 켬 · 0011 적용 2026-10-27 — 실기기 확인 대기): "바로 시작하기" → 이름 → 내 지도. 기본 기능 전부, 같이 그리기(초대 보내기·받기)만 로그인 — 카카오/Apple 연결(linkIdentity)로 같은 사용자 유지(지도 그대로). 게스트 설정: 로그인·기존 계정으로 로그인·기록 지우기(로그아웃 없음), 지도 목록 안내 배너. FLOW_AUTH.md Amendment 2026-10-27
- 카카오 실시간 핀(하이브리드, 2026-10-29 — 코드 완료·0016 적용·place-search resolve 배포, **실기기 확인 대기**, docs/Place Matching.md §11): 공공데이터와 안 맞으면 카카오 장소 ID·사용자가 친 검색어만 저장하고 볼 때마다 카카오에서 좌표·이름을 불러와 그림(데브톡 151294 허용 범위, 앱 메모리만). 확정 카드에 카카오 이름·주소 표시, 부를 이름은 선택. "찾던 곳이 맞나요?"의 "다른 곳이에요" → 카카오 위치로. 못 찾으면 목록에 "카카오에서 찾을 수 없어요". 실측: 공방·소품샵 17곳 중 매칭 없음 11곳 → 11/11 다시 찾음·좌표 일치. 데브톡 확인 문의 초안 §11.1(올리기는 사용자). 쿼터 절약(2026-10-29): 검색 = 카카오 1번(400ms·두 글자 이상·조합 중 한글 제외·같은 검색어 1시간 재사용), 실시간 핀 = 같은 검색어끼리 카카오 1번(실측 17핀 → 6번)·앱 켜 있는 동안 기억(최대 6시간)·필요한 핀만 모아 한 번에
- 장소 찾기 D′(2026-10-28 — 코드 완료·0014/0015 적용·place-search 배포(search+match)·서울 299,240건 적재·주간 자동 갱신·기존 11건 정리 완료, **실기기 확인 대기**, docs/Place Matching.md): 카카오 결과를 고르면 서버가 공공데이터(poi)에서 같은 가게를 찾아 그 이름·좌표로 핀 확정(확실 / "찾던 곳이 맞나요?" + 다른 곳이면 직접 찍기) · 없으면 우리 데이터의 동네 중심까지만 이동 → 직접 찍고 이름 씀(동네 중심 그대로는 거부). 저장 = 공공 레코드 또는 사용자 값 + 카카오 장소 ID(카카오맵 버튼)만. 매칭 검증(파일럿 100곳 → 카카오가 찾은 55곳): 공공데이터에 있는 33곳 모두 맞게 매칭(확실 30·확인 3), 놓친 곳 0, 공공데이터에 없음 19(랜드마크 4·전시 1·가게 14 → 직접 핀)
- (철회) 장소 찾기 Option C(0013 적용됨 — 카카오 측 답변상 불허 확인(2026-10-28, 데브톡 151294·151842·152223) → D′ 로 교체됨, ADR-016 "구현"): 카카오 검색 = 표시 전용(메모리만) → 고르면 지도 이동 → 가운데 핀을 맞추고 이름 확인 → 사용자가 확정한 위치·이름 + 카카오 장소 ID(카카오맵 링크)만 저장. "직접 핀 찍기"(외부 데이터 0), 핀의 "카카오맵" 버튼, 태블릿도 같은 확정 모드. 스위치 KAKAO_SEARCH_ASSIST(거절 시 false → 직접 핀만)
- 빠른 정리(2026-10-29): 설정 → "정보" 칸(장소 정보 = 소상공인시장진흥공단 상가정보 · 장소 검색 = 카카오 · 지도 = © OpenStreetMap contributors · OpenMapTiles · OpenFreeMap · 지도 엔진 MapLibre GL JS(BSD-3) · 앱 버전) — 출처 표시 의무를 앱 안에 둠. 매칭에 랜드마크 입점 가게 가드 배포("청계천" ≠ "펠트 청계천점", "63빌딩" ≠ "GS25 63빌딩점" — 실제 함수 확인, 파일럿 33/33 그대로, docs/Place Matching.md §9.1). ADR-006 → Superseded(ADR-016)
- 경험 1단계 "지도 앱 → 펼쳐 놓고 같이 그리는 종이 지도"(2026-10-31, 코드 완료 — 새 개발 빌드·실기기 확인 대기, docs/Experience Design.md): 빼기 = 핀 번호·자동 회색 동선·첫 화면 검색창·목록 버튼. 압정 핀(작성자 잉크 + 이름, 멀리선 이름 숨김, 새 핀은 '퐁' 떨어짐). 필통(이동·연필·잉크·형광펜·실 자·스티커·📌 핀): 도구를 들면 한 손가락은 그리기, 두 손가락은 지도 이동 — 선 종류는 map_objects.payload.k(예전 선 = 잉크). 실 자 = 두 점 + "약 1.6km · 걸어서 24분". 위는 종이 꼬리표(지도 이름·사람) + 🔍 + 📮. 범례 = 예전 목록 시트. 📮 지도 한 장으로 접기: 지금 화면을 1080×1920 jpeg(제목·날짜 소인·핀·메모·사람 범례·접힌 자국·출처 판권란)로 굽고 공유 창 — 핀 이름은 저장된 이름만(카카오 실시간 이름 제외). 진동(expo-haptics)·공유(expo-sharing·expo-file-system) 추가 — 네이티브 모듈이라 새 개발 빌드 필요, 그 전엔 진동은 조용히 꺼지고 공유는 "업데이트 후" 안내(앱이 죽지 않게 확인 후 불러옴). 태블릿에서도 핀 확정 카드가 뜨게 고침(예전엔 태블릿 초안이 안 보였음)
- 디자인 AI 티 빼기(2026-10-31, 코드 완료 — 새 개발 빌드 없이 돌아감, 실기기 확인 대기, DESIGN.md §3~5): 색 = 인쇄 지도 세계(지도 종이·인쇄 먹·군청 버튼·도로지도 빨강/노랑·사람별 인쇄 잉크 6색 — 잉크 키는 그대로, 색값만). 글꼴 = 시스템 글꼴 하나(주아·고운돋움을 넣었다가 "AI 티"로 걷어냄). 아이콘 = 손으로 그린 선 아이콘 24개(PNG 알파 마스크 + tintColor, react-native-svg 없이 — assets/icons, scripts/build-icons.py, <Icon>)로 이모지·기호 아이콘 전부 교체. 둥글기 재질별·그림자 두 단. 범례 = 압정 머리 줄(번호 배지 없음), 지도 서랍·검색 결과·설정 = 괘선 목록(새 지도는 떠 있는 + 대신 맨 위 줄). 지도 위 쪽지·반응 칩 = 종이 조각(왼쪽 잉크 띠). 내보내기 카드 = 액자 없이 지도가 종이를 꽉 채우고 왼쪽 위 표제란(제목·날짜·범례·축척), 날짜 소인 뺌. 반응 nope 표시 🤮 → 🙅, 스티커 셋 정리. 빈 상태·오류는 왼쪽 정렬 한 덩어리, 문구(해요체·"해 주세요"·명사형 오류 제목 없애기·줄표/가운뎃점 정리·을(를) 없애기). 스플래시·로그인의 영문 로고 "Couple Map"·랜덤 따옴표 문구 제거. 시트 여는 움직임·버튼 눌림·동작 줄이기 존중. 미리 본 그림: docs/design/experience/6-card-fullbleed.jpg(커밋 제외). 이어서(지도 앱 디자인 비교에서): 연필·잉크·실 밑에 종이색 테두리, 숫자 폭 고정(theme numeric). 검토로 고친 것: 기본 잉크를 DB 기본값(lilac=자주)에 맞추고 기본 한 쌍 = 자주·주홍, iOS 범례 시트 그림자(바깥 판/안쪽 판 나눔), 여는 중 닫기·끌기 튐, 지도 서랍 줄에 화면 읽기 "메뉴" 동작, 한 줄 입력칸 줄 간격 없앰, 아이콘 2배 해상도(48pt 까지 선명). 실 자 거리 글자가 타일 경계에서 두 번 찍히던 것(1단계부터) → 실 가운데 한 번, 실 방향으로. 접힌 느낌 빼기: 도로지도 바탕의 접힌 자국과 내보내기 카드의 접힌 자국을 없앰(종이 결만 남김). 움직임(src/utils/motion.ts): 시트 곡선·속도 이어받는 스프링·고무줄·동작 줄이기는 투명도로, 필통 도구 120ms 들기, 핀 0.32초 낙하 + 바늘 닿는 순간 진동, 지도 펼치기(보드를 그날 처음 열 때 세 폭 종이가 펴짐 — 타일 로딩을 가림, 탭하면 건너뜀, 보드별 하루 한 번 AsyncStorage). 미리 본 그림 docs/design/experience/7-unfold.jpg(커밋 제외). 지도 바탕 고르기(코드 완료 · 0017 적용 2026-10-31 — 실기기 확인 대기): 지도마다 바탕 저장(boards.map_style, 같이 그리는 사람도 같은 바탕), 필통 위 바탕 버튼 → 미리보기 그림을 넘겨 보며 고르는 판(assets/map-styles), 설정은 "새 지도 기본 바탕". 새 바탕 2종 = 입체 지도(스위스식 산 음영)·시가지도(일본 도시지도처럼 건물·골목 또렷) — 기준: 멋지고·편하고·깔끔하고·잘 보여야
- 지도 바탕 = 종이 지도 3종(2026-10-31, 코드 완료 — 실기기 확인 대기): 방향 "내비게이션 이전의 종이 지도 위에 지금의 UI". positron 대신 자체 스타일(src/components/mapStyles.ts) — 90년대 도로지도(기본)·지도책(사회과부도, 높이 색)·측량 지형도(등고선·방안 격자, 선 가늘게). 산 음영·높이 색 = Mapzen Terrain Tiles(AWS, 키리스), 등고선 = maplibre-contour 0.1.1(BSD, vendor 로 WebView 에 넣음 — npm run vendor:maplibre). 설정 "지도 바탕 (시험 중)"에서 기기별로 골라 비교(AsyncStorage). 바꾸면 핀·스티커·펜 선·카메라는 그대로 두고 바탕만 갈아 끼움. 지명은 한국어 먼저(name:ko). 지형 출처는 지도 출처 표시·설정 정보에. 시안·비교 그림 docs/design/map-style-drafts.html·map-drafts/(커밋 제외). 확인할 것: 저사양 안드로이드에서 산 음영·등고선 속도, 지도책 초록 바탕 위 초록 잉크 핀 대비
- 보드 화면 정리(2026-10-29, 동작 그대로 — 실기기 확인 대기): BoardDetailScreen 1,408 → 441줄. 로직은 훅(useCanvasTools 스티커·펜·편집 / usePlacing 핀 확정 / useBoardMapSync 지도 주입 / useKeyboardHeight / useSubmittedQuery 검색 디바운스), 화면 조각은 컴포넌트(BoardTopOverlay · BoardFabGroup · PlaceActionBar 반응·메모 · CanvasToolBars · FloatingBar 바 공용 틀 · HalfSheet). 반응·메모 저장은 화면에 둔다(바가 닫힌 뒤 실패해도 알림이 뜨게). 달라진 점: 핀 바를 다시 열면 메모 입력은 닫힌 채로 시작
- 잉크 고르기 + 작성자 3구분(코드 완료·0012 적용됨): 설정 → 내 잉크(6색). 지도·목록·카드에서 나 = 내 잉크, 지금 상대 = 상대 잉크(같으면 내 화면에서 다음 색), 예전 상대·떠난 사람 = 회색. 잉크를 바꾸면 카메라 그대로 다시 칠함
- 지도 위치 기억: 보드마다 마지막 카메라(가운데·줌)를 기억(AsyncStorage, 최근 50개) → 다시 들어오면 그 자리. 지도를 직접 움직인 뒤에는 데이터가 바뀌어도 카메라를 건드리지 않음(Recenter 로 장소 기준 복귀). 브라우저 검증: 3구분 색·setInks 재칠(카메라 유지)·사용자 이동 후 유지·setCamera·recenter·camera 메시지
- 보드 이름 바꾸기·지우기(목록 ⋯ 메뉴, 지우기는 확인 알림) · "데이트" 문구 정리(목록·만들기·로그인·스플래시 → "지도"·"같이 그려요")

## 현재 버그

- ~~스티커 생성 안 됨~~ → C1 해결(0004 적용, map_objects 생성·RLS 확인 2026-06-13)
- ~~반응 하트만 저장~~ → C1 해결(0003 적용, CHECK 교체)
- ~~지도 줌/위치 유지 안 됨~~ → 구현(2026-10-28, 보드별 카메라 기억)
- 반응 팔레트 외부 탭 닫기 → 코드 존재, 실기기 재현 확인 필요(B/D 미확정)

## DB

- 0002 solo_workspace … 적용됨(검증: status에 solo 포함)
- 0003 reaction_types … 적용됨(2026-06-13)
- 0004 map_objects … 적용됨(2026-06-13, REST 200 + RLS 42501 확인)
- 0005 couples_rls_hardening … 적용됨(2026-10-25, couples 정책 = couples_select 만 / is_member_of_couple status 필터·SECURITY DEFINER 확인). 적용 시점 couples = solo 3, active/ended 0
- 0006 push_notifications … 적용됨(2026-10-25). pg_net 0.20.3 + push_tokens/push_throttle(RLS on, 정책 0) + 장소·반응·메모·스티커 AFTER INSERT 트리거 4개. notify_partner 는 anon/authenticated 실행 불가 확인. 롤백 테스트(임시 커플 연결 + 테스트 토큰 + 메모)에서 Expo Push 요청 1건 큐잉 확인 후 전부 롤백
- 0007 push_draw_text … 적용됨(2026-10-25). 그림 알림 문구("✏️ 지도에 낙서")·종류 draw 분리. trg_push_map_object 본문에 draw 문구 포함·authenticated 실행 불가·트리거 연결 1개 확인. 롤백 테스트(임시 커플 연결 + 테스트 토큰 + draw 1·sticker 1)에서 요청 2건 큐잉("✏️ 지도에 낙서" / "✨ C 스티커", 종류별 간격 따로) 확인 후 전부 롤백(solo 3·토큰·간격·큐 0)
- 0008 invite_merge … 적용됨(2026-10-26). accept_invite 솔로 보드 합치기 + 비로그인 거부(anon 실행 권한 회수 — 0002 부터 있던 구멍: auth.uid() 가 null 이면 초대자 공간이 상대 없이 active 가 될 수 있었음) + invite_preview(authenticated 전용). 적용 전 점검 solo 3·active 0·보드 5. 확인: 합치기 본문·가드 포함, 옛 'acceptor has solo data' 없음, anon 실행 불가(accept·preview), preview SECURITY DEFINER. 롤백 테스트(실제 솔로 2곳 — 보드 4 + 1): 비로그인 → 'not authenticated', 미리보기 ok → 수락 → 초대자 공간 유지·active·상대 합류·보드 5개 한곳·수락자 솔로 삭제·미리보기 used·푸시 큐 0 확인 후 전부 롤백(solo 3·보드 4/1/0·테스트 초대 0). 오프라인(PGlite) 24항목 통과
- 0009 board_activity … 적용됨(2026-10-27). board_reads + mark_board_read + board_activity(SECURITY INVOKER). 적용 전 점검 solo 3·active 0·보드 5·지도 객체 31·board_reads 없음. 확인: 테이블·RLS on·정책 board_reads_select(SELECT)만, mark_board_read SECURITY DEFINER / board_activity INVOKER, anon 실행 불가·authenticated 가능. 롤백 테스트(실제 솔로 공간을 임시로 2인 연결, authenticated 역할로 RLS 적용): 상대에게 보드 4개만 보임 · 안 본 보드 새 흔적 20 → 읽음 기록 후 0 → 상대 새 그림 후 1 · 작성자 본인은 0 · 외부인 기록 거부('not a board member') · 푸시 큐 0 확인 후 전부 롤백(solo 3·보드 5·객체 31·읽음 기록 0). 오프라인(PGlite, RLS 켠 authenticated 역할) 16항목 통과: 상대 흔적만 셈·읽음 후 0·이후 새 흔적만·RLS 로 내 공간만·외부인 기록 거부·직접 쓰기 차단·보드 삭제 시 CASCADE·anon 권한 없음·재실행 안전

- 0013 place_provider_kakao … 적용됨(2026-10-28). places.provider CHECK 를 이름 무관하게 지우고 ('naver','manual','kakao') 로 재생성. 적용 전 점검 places_provider_check(kakao·naver·manual) 1개·장소 11(전부 kakao). 확인: provider 제약 = places_provider_check 1개('naver','manual','kakao'). 롤백 테스트: kakao(장소 ID 포함)·manual·naver 저장 ok, google 거부(places_provider_check), 푸시 큐 0 확인 후 롤백(장소 11·테스트 0). 오프라인(PGlite, 운영처럼 다른 이름 제약을 흉내) 7항목 통과
- 0016 place_kakao_live … 적용됨(2026-10-29). places.live_query + provider ('public','manual','kakao_live')(kakao·naver 제거) + places_live_check. 적용 전 점검 places 4(전부 public)·제약 3·live_query 없음. 롤백 테스트: 실시간 핀(ID+검색어) 저장 ok · 검색어 없음/ID 없음 거부(places_live_check) · kakao/naver 거부(places_provider_check) · 푸시 큐 0. 오프라인(PGlite) 0016 제약 13항목 통과
- 0017 board_map_style … 적용됨(2026-10-31). boards.map_style(text, null 허용) + boards_map_style_check(소문자·숫자·하이픈 32자). 적용 전 점검 보드 5·map_style 없음·제약 fkey/pkey·정책 4(select/insert/update/delete). 확인: 컬럼 text/nullable·CHECK 식·정책 그대로·바탕 고른 보드 0. 롤백 테스트(authenticated 역할로 RLS 적용, 끝에 일부러 오류로 전부 되돌림): 같은 공간 사람 변경 1행(relief) · 외부인 0행 · 모양이 틀린 이름(Relief!) 거부(check_violation)
- 0015 poi_rebuild_dongs_safeupdate … 적용됨(2026-10-28). 첫 자동 적재(GitHub Actions)가 REST 로 poi_rebuild_dongs 를 부를 때 pg_safeupdate 가 WHERE 없는 DELETE 를 막아 실패("DELETE requires a WHERE clause") → where true. 적용 뒤 SQL Editor 에서 재계산 466개. 오프라인(PGlite) 30항목 통과
- 서울 공공데이터 첫 적재(2026-10-28, 워크플로 poi-refresh 수동 실행): 포털에서 352MB 받음(해외 러너에서 접속 OK) → 299,240건 업서트 151초 → 동네 466. 확인: poi 299,240·기준일 2026-06-30·25개 구·빈 문자열 0·poi 89MB·DB 101MB(무료 500MB 안)
- 0014 poi_matching … 적용됨(2026-10-28). poi·poi_dongs(RLS on·정책 0·anon/authenticated 권한 없음) + poi_lookup(service_role 만)·poi_rebuild_dongs + places.kakao_place_id(숫자만) + provider 'public'(상가업소번호 필수). 적용 전 점검 poi 없음·provider 제약 1개·장소 11(전부 kakao)·DB 12MB. 확인: RLS·정책 0·권한(anon/auth 읽기·호출 불가, service_role 가능)·SECURITY DEFINER·poi_geo 인덱스·제약 3개. 롤백 테스트: 시험 poi 2건 → 동네 1·150m 후보 1건(380m 밖 제외)+동네 중심, authenticated/anon 거부, public+상가번호 저장 ok·상가번호 없는 public 거부·문자 섞인 카카오 ID 거부·푸시 큐 0 → 롤백(poi 0·장소 11). 오프라인(PGlite) 28항목 통과
- 0012 user_ink … 적용됨(2026-10-28). users.ink(기본 lilac, 6색 CHECK). 적용 전 점검 users 3·ink 컬럼 없음·users CHECK 없음·정책 insert/select/update·트리거 updated_at. 확인: ink text not null default 'lilac', users_ink_check 6색(theme.ts 와 같음), 기존 3명 lilac. 롤백 테스트(실제 솔로 공간을 임시로 2인 연결, authenticated 역할로 RLS 적용): 본인 mint 변경 ok · purple 거부(users_ink_check) · 상대 잉크 변경 0행 · 상대가 내 잉크 읽기 ok(mint) · 외부인 0행 · 푸시 큐 0 확인 후 롤백(users 3 전부 lilac·solo 3·연결 0). 오프라인(PGlite) 7항목 통과: 기본값·본인 변경·없는 색 거부·상대 변경 불가(RLS)·상대 읽기 가능·외부인 읽기 불가·재실행 안전(값 유지)
- 0011 guest_invite_block … 적용됨(2026-10-27). 같은 날 Auth 설정: Allow anonymous sign-ins ON · Allow manual linking ON(Confirm email OFF 유지). 적용 전 점검 사용자 3(익명 0)·solo 3·active 0·초대 2·auth.jwt() 있음. 확인: is_permanent_user 1개, 정책 couple_invites_insert_permanent = RESTRICTIVE·INSERT·authenticated, accept_invite·invite_preview 에 login required(합치기 본문 유지), anon 실행 불가·authenticated 가능. 롤백 테스트(실제 사용자에 is_anonymous 클레임, authenticated 역할): 게스트 그림 저장 OK / 초대 만들기 RLS 거부 / 미리보기·받기 'login required' / 같은 사람 로그인 클레임이면 초대 만들기 OK / 푸시 큐 0 → 전부 롤백(사용자 3·solo 3·초대 2·테스트 초대 0·객체 31).
  - 작성 시점 기록: is_permanent_user + 게스트 초대 만들기 RLS 제한 + accept_invite·invite_preview 로그인 확인. 오프라인(PGlite, JWT is_anonymous) 13항목 통과: 게스트 장소·그림·새 흔적 OK / 게스트 초대 만들기·미리보기·받기 거부 / 로그인한 사람 OK / 게스트가 로그인(같은 uid) 후 받기 성공 + 게스트 때 보드 합쳐짐 / 재실행 안전. 0008·0009·0010 테스트 회귀 통과
- 0010 account_deletion … 적용됨(2026-10-27). leave_workspace + delete_my_account(SECURITY DEFINER, auth.users 삭제 — postgres DELETE 권한 확인) + places/map_objects.created_by NULL 허용. 적용 전 점검 계정 3·프로필 3·solo 3·active 0·보드 5·장소 11·객체 31·메모 0·반응 7·초대 2. 확인: created_by NULL 허용(places·map_objects), 두 함수 SECURITY DEFINER·소유자 postgres, anon 실행 불가·authenticated 가능. 롤백 테스트(실제 데이터 — 솔로 공간에 다른 사용자를 임시 연결 + 그 사람의 장소·메모·반응·그림 추가): 비로그인 → 'not authenticated' / 연결 끊기 → 남는 사람이 user_a·solo / 상대 계정 삭제 → 공간 solo 로 남는 사람 보유·보드 4개 유지·상대 auth·프로필 삭제·상대 메모·반응 0·상대 장소/그림 작성자 NULL·내 메모 유지 / 혼자 쓰던 사람 계정 삭제 → 공간·보드·auth·프로필 0 / 푸시 큐 0 → 전부 롤백(계정 3·solo 3·보드 5·장소 11·작성자 없는 장소 0·객체 31·메모 0·반응 7·초대 2). 오프라인(PGlite) 31항목 통과: 함께 쓰던 사람 탈퇴 시 상대가 지도 보유·내 메모/반응 삭제·장소/그림 작성자 없음·상대 메모 유지 / 혼자 쓰던 지도 전부 삭제 / 연결 끊기(user_a·user_b 둘 다) / 나간 사람 RLS 차단·새로 시작 가능 / 비로그인 거부 / 재실행 안전

## 다음

- 게스트 정리 예약 작업(오래 안 쓴 익명 사용자 — delete_my_account 순서로) · 익명 로그인 CAPTCHA 검토 · 이메일 연결(커스텀 SMTP 후)

- ~~Sentry 연결~~ → 코드 완료(2026-10-27, @sentry/react-native 7.11): DSN(`EXPO_PUBLIC_SENTRY_DSN`)만 넣으면 켜짐 — 화면 오류·예상 밖 오류·지도 실패·네이티브 크래시. 남은 일(직접): Sentry 프로젝트·DSN, 출시 빌드 전 소스맵 토큰. docs/Sentry Setup.md
- 개인정보처리방침·이용약관: 운영자(개인 — 본명) · 문의 이메일(비즈니스 계정 새로 만들 예정) 받으면 web/ 에 페이지 + 가입 동의. 처리 위탁·국외 이전: Supabase(시드니)·Sentry·Expo 푸시·OpenFreeMap
- iPad 지원 유지(supportsTablet true) — iPad 전용 UI 를 따로 설계할 예정(2026-10-27). 스토어에 iPad 스크린샷 필요
- 앱 이름 보류(가칭 유지) · 번들 ID/패키지명 미정 — 첫 TestFlight/Play 업로드 전에 확정(올린 뒤엔 못 바꿈)
- 지도 스타일·타일도 오프라인 대비가 필요하면 PMTiles 자가호스팅(ADR-013) — 지금은 OpenFreeMap 네트워크 의존

- 소셜 로그인 콘솔 설정(직접): Supabase Redirect URL `couplemap://auth/callback` · 카카오 앱(REST 키·Client Secret·Redirect URI·동의항목) → Supabase Kakao(이메일 없는 사용자 허용) · Apple Developer App ID Sign in with Apple → Supabase Apple Client IDs. 그 뒤 새 개발 빌드(expo-apple-authentication·expo-web-browser 네이티브 모듈 추가)
- Apple 로그인 계정 삭제 시 Apple 토큰 해지(auth/revoke, Edge Function) — App Store 심사 요구
- 카카오 버튼 말풍선 심볼(공식 리소스) · 번들 ID/패키지명 확정(앱 이름과 함께)

- Google Play 데이터 삭제 웹 링크: 앱 없이도 삭제를 요청할 수 있는 페이지(web/ 에 추가, 문의 이메일 필요) — Play Console 데이터 보안 양식에 입력
- ~~작성자 3구분~~ → 구현(2026-10-28, 예전 상대·떠난 사람 = 회색)

- ~~Sticker 버그 수정~~ → C1 완료
- 외부 탭 닫기 B/D 판별(실기기 로그)
- 장소 검색 데이터 라이선스(ADR-016, **Accepted 2026-10-28 — D′: 공공데이터 정본 + 카카오 매칭**): 카카오 = 찾기·매칭 조회 키, 저장 = 공공데이터(상가정보 서울 ≈ 30만 건) 레코드 또는 사용자 핀 + 카카오 장소 ID(링크)만. 설계 docs/Place Matching.md — 적재·분기 갱신은 자동(scripts/poi-import/refresh_poi.py + .github/workflows/poi-refresh.yml, 매주 월 03:00 KST, 포털 다음 등록 예정 2026-10-31). 저장소 Secret SUPABASE_SERVICE_ROLE_KEY 등록됨. 기존 카카오 11건(6월 테스트 데이터) 정리(2026-10-28): 확실히 매칭된 4건(스타벅스 더북한산점 2·안암 2) → 공공 레코드(이름·좌표 교체, provider public, kakao_place_id = 옛 카카오 ID), 나머지 7건(숙정문·대구 1·안암역 2·고려대 캠퍼스·카페파인·안암병원 — 공공데이터에 없거나 다른 가게로만 걸림) + 반응 7개는 삭제(사용자가 직접 실행). 확인: places 4(전부 public·카카오 ID 만 남음)·반응 0·메모 0·고아 반응 0·푸시 큐 0 → 운영 DB 에 카카오 유래 이름·좌표 없음. 'kakao'·'naver' provider 는 이제 쓰는 행이 없어 CHECK 에서 빼도 됨(후속 마이그레이션 후보). 1단계 남은 것: 실기기 확인(JS 변경뿐이라 개발 서버 새로고침이면 됨). 대시보드 CSV 가져오기는 0건으로 끝나 쓰지 않음. 확장 메모: 전국 = 같은 파일·지역 설정만(용량상 Supabase Pro) / 해외 = 카카오 불가 → 나라별 저장 가능한 공개 데이터(Overture·Foursquare OS Places) 정본 + 이름 정규화 유니코드화·외부 링크 칸 일반화 출시 필수. 2단계 = OSM 랜드마크 보완
- ~~초대 페이지 배포~~ → GitHub Pages(Source: GitHub Actions) 켜고 invite-page 워크플로 배포 확인(2026-10-26). 이후 web/ 변경은 main 푸시 시 자동 배포. 자체 도메인 생기면 유니버설 링크/App Links
- ~~남은 커플 전용 문구 정리~~ → 완료(2026-10-27)
- 푸시 자격 증명: Android FCM V1(google-services.json + EAS 서비스 계정 키), iOS APNs 키(EAS) → 개발 빌드 재생성(expo-notifications 네이티브 모듈 추가)
- Text Object
- Arrow Object

## 보류

- ~~Draw~~ → 구현(2026-10-25)
- 줌 레이어 정책
