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
- 초대 흐름 v2(코드 작성 완료 — 0008 DB 적용·Pages 켜기 대기): 웹 초대 페이지(web/invite, 앱 없어도 열림) · 로그인 전 받은 코드 보존(48시간) · 솔로 데이터 합치기 · 수락 전 미리보기 · "같이 그릴 사람" 문구 (FLOW_AUTH.md Amendment 2026-10-26)

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
- 0008 invite_merge … 작성됨, **미적용**(2026-10-26). accept_invite 솔로 보드 합치기 + invite_preview(authenticated 전용). 오프라인 검증(PGlite, 0001·0002·0004·0005·0008): 합치기·새 공간·거부 사유·미리보기 6종·권한 22항목 통과

## 다음

- ~~Sticker 버그 수정~~ → C1 완료
- 외부 탭 닫기 B/D 판별(실기기 로그)
- 장소 검색 데이터 라이선스(ADR-016, Proposed): 네이버·카카오 공식 질의 → 공공데이터(상가정보) 검색 스파이크 → 사용자 핀 경로. 출시 전 필수(네이버 기존 방식 2027-06-30 종료)
- 초대 페이지 배포: 저장소 Settings → Pages → Source "GitHub Actions" 켜기 → main 푸시 시 invite-page 워크플로가 web/ 배포. 자체 도메인 생기면 유니버설 링크/App Links
- 남은 커플 전용 문구 정리: 보드 목록·만들기·스플래시의 "데이트" 문구
- 푸시 자격 증명: Android FCM V1(google-services.json + EAS 서비스 계정 키), iOS APNs 키(EAS) → 개발 빌드 재생성(expo-notifications 네이티브 모듈 추가)
- Text Object
- Arrow Object

## 보류

- ~~Draw~~ → 구현(2026-10-25)
- 줌 레이어 정책
