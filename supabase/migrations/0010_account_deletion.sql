-- 0010_account_deletion.sql
-- 연결 끊기 + 계정 삭제 (출시 필수: 애플·구글 모두 앱 안에서 계정 삭제를 요구한다).
--
-- 연결 끊기(leave_workspace): 함께 쓰던 공간에서 "나가는" 사람만 빠진다.
--   - 남는 사람이 공간과 지도를 그대로 갖고 혼자 쓰기(solo)로 바뀐다.
--   - 나간 사람은 공간이 없는 상태(no_workspace)에서 다시 시작한다.
--   - 나간 사람의 흔적은 남는 사람 지도에 그대로 남는다(작성자 유지).
--   (DATABASE.md 의 "관계 종료 = status 'ended'" 는 쓰지 않는다 — ended 는 두 사람 모두 지도를 잃는다.)
--
-- 계정 삭제(delete_my_account): 되돌릴 수 없다.
--   1) 함께 쓰는 중이면 먼저 연결 끊기 → 상대가 지도를 갖는다
--   2) 혼자 쓰던 공간이면 공간과 지도를 모두 지운다(하위 흔적 CASCADE)
--   3) 다른 사람 지도에 남은 내 흔적: 메모·반응은 지우고, 장소·스티커·그림은 작성자 없이(created_by NULL) 남긴다
--      — 장소를 지우면 그 위의 상대 메모·반응까지 지워지므로
--   4) 내가 만든 초대 삭제, auth.users 삭제 → users·푸시 토큰·읽음 기록은 CASCADE
-- 주의: 초안. 실제 DB 적용은 별도 절차(SUPABASE_SETUP.md §3 방식)로 수행한다. 재실행 안전.

-- ============================================================
-- 1. 작성자 없는 흔적 허용 (탈퇴한 사람의 장소·지도 객체)
-- ============================================================
alter table public.places alter column created_by drop not null;
alter table public.map_objects alter column created_by drop not null;

-- ============================================================
-- 2. leave_workspace — 함께 쓰는 공간에서 나가기
-- ============================================================
create or replace function public.leave_workspace()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  ws  public.couples;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select * into ws
  from public.couples
  where status in ('solo', 'active')
    and (user_a_id = uid or user_b_id = uid)
  limit 1
  for update;

  if ws.id is null or ws.status <> 'active' then
    raise exception 'not connected';
  end if;

  -- 남는 사람을 user_a 로 (user_a_id 는 NOT NULL)
  update public.couples
  set user_a_id = case when ws.user_a_id = uid then ws.user_b_id else ws.user_a_id end,
      user_b_id = null,
      status = 'solo',
      updated_at = now()
  where id = ws.id;

  -- 이제 못 보는 보드의 읽음 기록 정리
  delete from public.board_reads
  where user_id = uid
    and board_id in (select b.id from public.boards b where b.couple_id = ws.id);
end;
$$;

revoke execute on function public.leave_workspace() from public, anon;
grant execute on function public.leave_workspace() to authenticated;

-- ============================================================
-- 3. delete_my_account — 계정과 데이터 삭제
-- ============================================================
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  ws  public.couples;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select * into ws
  from public.couples
  where status in ('solo', 'active')
    and (user_a_id = uid or user_b_id = uid)
  limit 1;

  if ws.status = 'active' then
    perform public.leave_workspace();
  elsif ws.status = 'solo' then
    delete from public.boards where couple_id = ws.id;
    delete from public.couples where id = ws.id;
  end if;

  -- 지난 관계(ended)는 아무도 볼 수 없는 기록이므로 함께 정리
  delete from public.boards
  where couple_id in (
    select c.id from public.couples c
    where c.status = 'ended' and (c.user_a_id = uid or c.user_b_id = uid)
  );
  delete from public.couples
  where status = 'ended' and (user_a_id = uid or user_b_id = uid);

  -- 다른 사람 지도에 남은 내 흔적
  delete from public.place_memos where user_id = uid;
  delete from public.place_reactions where user_id = uid;
  update public.places set created_by = null where created_by = uid;
  update public.map_objects set created_by = null where created_by = uid;

  delete from public.couple_invites where created_by = uid;

  -- 계정 삭제 → public.users · push_tokens · push_throttle · board_reads CASCADE
  delete from auth.users where id = uid;
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
