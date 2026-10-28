-- 0012_user_ink.sql
-- 각자 잉크 고르기(DESIGN.md "사람마다 잉크"): 사람마다 자기 색을 고른다. 지도에서 나·지금 상대는 각자의 잉크,
-- 예전 상대·떠난 사람의 흔적은 회색으로 보인다(앱에서 계산). 6색은 src/constants/theme.ts inks 와 같아야 한다.
-- 읽기·쓰기 권한은 기존 users 정책 그대로: 본인 수정(users_update) · 본인과 같은 공간 상대 조회(users_select).
-- 주의: 초안. 실제 DB 적용은 별도 절차(SUPABASE_SETUP.md §3 방식)로 수행한다. 재실행 안전.

alter table public.users add column if not exists ink text not null default 'lilac';

alter table public.users drop constraint if exists users_ink_check;
alter table public.users
  add constraint users_ink_check check (ink in ('lilac', 'sky', 'mint', 'butter', 'peach', 'rose'));
