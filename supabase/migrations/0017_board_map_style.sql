-- 0017_board_map_style.sql
-- 지도마다 바탕(종이 지도 디자인)을 고른다 — 여행 지도는 지도책, 동네 산책은 시가지도처럼. 같이 그리는 사람에게도 같은 바탕.
-- 값은 src/components/mapStyles.ts 의 MapStyleName(roadmap·atlas·topo·relief·city …). 디자인을 더할 때마다
-- 마이그레이션이 필요 없도록 목록 CHECK 대신 글자 모양(소문자·숫자·하이픈, 32자까지)만 막는다. 앱은 모르는 이름이면 기본 바탕으로 그린다.
-- null = 고르지 않음(그 기기의 기본 바탕). 읽기·쓰기 권한은 기존 boards 정책 그대로(같은 공간 멤버: boards_select · boards_update).
-- 주의: 초안. 실제 DB 적용은 별도 절차(SUPABASE_SETUP.md §3 방식)로 수행한다. 재실행 안전.

alter table public.boards add column if not exists map_style text;

alter table public.boards drop constraint if exists boards_map_style_check;
alter table public.boards
  add constraint boards_map_style_check check (map_style is null or map_style ~ '^[a-z0-9-]{1,32}$');
