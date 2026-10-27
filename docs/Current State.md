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
- 보드 이름 바꾸기·지우기(목록 ⋯ 메뉴, 지우기는 확인 알림) · "데이트" 문구 정리(목록·만들기·로그인·스플래시 → "지도"·"같이 그려요")

## 현재 버그

- ~~스티커 생성 안 됨~~ → C1 해결(0004 적용, map_objects 생성·RLS 확인 2026-06-13)
- ~~반응 하트만 저장~~ → C1 해결(0003 적용, CHECK 교체)
- 지도 줌/위치 유지 안 됨 → 미구현(신규 기능, 보류)
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

- 0010 account_deletion … 적용됨(2026-10-27). leave_workspace + delete_my_account(SECURITY DEFINER, auth.users 삭제 — postgres DELETE 권한 확인) + places/map_objects.created_by NULL 허용. 적용 전 점검 계정 3·프로필 3·solo 3·active 0·보드 5·장소 11·객체 31·메모 0·반응 7·초대 2. 확인: created_by NULL 허용(places·map_objects), 두 함수 SECURITY DEFINER·소유자 postgres, anon 실행 불가·authenticated 가능. 롤백 테스트(실제 데이터 — 솔로 공간에 다른 사용자를 임시 연결 + 그 사람의 장소·메모·반응·그림 추가): 비로그인 → 'not authenticated' / 연결 끊기 → 남는 사람이 user_a·solo / 상대 계정 삭제 → 공간 solo 로 남는 사람 보유·보드 4개 유지·상대 auth·프로필 삭제·상대 메모·반응 0·상대 장소/그림 작성자 NULL·내 메모 유지 / 혼자 쓰던 사람 계정 삭제 → 공간·보드·auth·프로필 0 / 푸시 큐 0 → 전부 롤백(계정 3·solo 3·보드 5·장소 11·작성자 없는 장소 0·객체 31·메모 0·반응 7·초대 2). 오프라인(PGlite) 31항목 통과: 함께 쓰던 사람 탈퇴 시 상대가 지도 보유·내 메모/반응 삭제·장소/그림 작성자 없음·상대 메모 유지 / 혼자 쓰던 지도 전부 삭제 / 연결 끊기(user_a·user_b 둘 다) / 나간 사람 RLS 차단·새로 시작 가능 / 비로그인 거부 / 재실행 안전

## 다음

- Google Play 데이터 삭제 웹 링크: 앱 없이도 삭제를 요청할 수 있는 페이지(web/ 에 추가, 문의 이메일 필요) — Play Console 데이터 보안 양식에 입력
- 작성자 3구분(나·지금 상대·떠난 사람/예전 상대): 지금은 "나 아님 = 상대 색" — 연결을 끊고 새 사람과 연결하면 예전 사람 흔적이 새 상대 색으로 보임

- ~~Sticker 버그 수정~~ → C1 완료
- 외부 탭 닫기 B/D 판별(실기기 로그)
- 장소 검색 데이터 라이선스(ADR-016, Proposed): 네이버·카카오 공식 질의 → 공공데이터(상가정보) 검색 스파이크 → 사용자 핀 경로. 출시 전 필수(네이버 기존 방식 2027-06-30 종료)
- ~~초대 페이지 배포~~ → GitHub Pages(Source: GitHub Actions) 켜고 invite-page 워크플로 배포 확인(2026-10-26). 이후 web/ 변경은 main 푸시 시 자동 배포. 자체 도메인 생기면 유니버설 링크/App Links
- ~~남은 커플 전용 문구 정리~~ → 완료(2026-10-27)
- 푸시 자격 증명: Android FCM V1(google-services.json + EAS 서비스 계정 키), iOS APNs 키(EAS) → 개발 빌드 재생성(expo-notifications 네이티브 모듈 추가)
- Text Object
- Arrow Object

## 보류

- ~~Draw~~ → 구현(2026-10-25)
- 줌 레이어 정책
