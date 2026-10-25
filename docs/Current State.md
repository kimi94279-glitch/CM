# Current State

## 완료

- Place Reaction MVP
- reaction overlay
- map_objects 도입
- Sticker P0 구현
- 작성자 구분(나=코랄/상대=틸: 핀·반응 칩·스티커 외곽선·목록·범례)
- 한 줄 메모(핀 말풍선, place_memos 사용)
- 푸시 알림(0006 트리거 → Expo Push, 탭 시 그 핀으로 이동) — DB 적용 완료, 자격 증명·개발 빌드 대기

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

## 다음

- ~~Sticker 버그 수정~~ → C1 완료
- 외부 탭 닫기 B/D 판별(실기기 로그)
- 푸시 자격 증명: Android FCM V1(google-services.json + EAS 서비스 계정 키), iOS APNs 키(EAS) → 개발 빌드 재생성(expo-notifications 네이티브 모듈 추가)
- Text Object
- Arrow Object

## 보류

- Draw
- 줌 레이어 정책
