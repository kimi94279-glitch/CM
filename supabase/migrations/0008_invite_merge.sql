-- 0008_invite_merge.sql
-- 초대 흐름 보강.
--  1) accept_invite: 수락자가 혼자 그리던(솔로) 지도가 있어도 합류한다 — 보드를 함께 쓰는 공간으로 옮긴 뒤 솔로 공간을 지운다.
--     (0002 에서는 'acceptor has solo data' 로 거부했다.)
--     비로그인 호출 차단(auth.uid() null 거부 + anon 실행 권한 회수).
--  2) invite_preview: 수락 전에 "누가 보낸 초대인지 / 아직 쓸 수 있는지"를 보여준다. 로그인한 사용자만 호출.
-- 주의: 초안. 실제 DB 적용은 별도 절차(SUPABASE_SETUP.md §3 방식)로 수행한다. 재실행 안전(or replace).

-- ============================================================
-- 1. accept_invite 재정의 (솔로 데이터 합치기)
-- ============================================================
-- 동작:
--  - 수락자가 active 면 거부
--  - 초대자가 active 면 거부 / solo 면 그 행을 active 로 승격 / 없으면 새 active 생성
--  - 수락자의 solo 공간이 있으면 그 보드를 결과 공간으로 옮기고 solo 행을 지운다
--    (장소·메모·반응·스티커·그림은 board_id 로 따라온다. 작성자(created_by)는 그대로라 색 구분 유지)
create or replace function public.accept_invite(token text)
returns public.couples
language plpgsql
security definer
set search_path = public
as $$
declare
  inv         public.couple_invites;
  acceptor    uuid := auth.uid();
  acceptor_ws public.couples;
  inviter_ws  public.couples;
  result_ws   public.couples;
begin
  -- 비로그인(auth.uid() = null) 호출이면 초대자 공간이 상대 없이 active 가 될 수 있었다
  if acceptor is null then
    raise exception 'not authenticated';
  end if;

  select * into inv
  from public.couple_invites
  where invite_token = token
  for update;

  if inv.id is null then
    raise exception 'invalid invite';
  end if;
  if inv.used_at is not null then
    raise exception 'invite already used';
  end if;
  if inv.expires_at <= now() then
    raise exception 'invite expired';
  end if;
  if inv.created_by = acceptor then
    raise exception 'cannot accept own invite';
  end if;

  -- 수락자의 기존 공간 (나중에 합칠 대상)
  select * into acceptor_ws
  from public.couples
  where status in ('solo', 'active')
    and (user_a_id = acceptor or user_b_id = acceptor)
  limit 1
  for update;

  if acceptor_ws.status = 'active' then
    raise exception 'already in an active couple';
  end if;

  -- 초대자의 공간
  select * into inviter_ws
  from public.couples
  where status in ('solo', 'active')
    and (user_a_id = inv.created_by or user_b_id = inv.created_by)
  limit 1
  for update;

  if inviter_ws.id is not null then
    if inviter_ws.status = 'active' then
      raise exception 'inviter already coupled';
    end if;
    -- 초대자의 솔로 공간을 함께 쓰는 공간으로 승격 (데이터 유지)
    update public.couples
    set user_b_id = acceptor,
        status = 'active',
        updated_at = now()
    where id = inviter_ws.id
    returning * into result_ws;
  else
    insert into public.couples (user_a_id, user_b_id, status)
    values (inv.created_by, acceptor, 'active')
    returning * into result_ws;
  end if;

  -- 수락자의 솔로 보드를 옮기고 빈 솔로 공간을 지운다 (boards.couple_id 는 on delete restrict)
  if acceptor_ws.id is not null then
    update public.boards
    set couple_id = result_ws.id,
        updated_at = now()
    where couple_id = acceptor_ws.id;

    delete from public.couples where id = acceptor_ws.id;
  end if;

  update public.couple_invites
  set used_at = now(),
      updated_at = now()
  where id = inv.id;

  return result_ws;
end;
$$;

revoke execute on function public.accept_invite(text) from public, anon;
grant execute on function public.accept_invite(text) to authenticated;

-- ============================================================
-- 2. invite_preview — 수락 전 미리보기
-- ============================================================
-- 비멤버는 couple_invites 를 직접 읽을 수 없으므로(RLS) 필요한 두 가지만 돌려준다.
-- state: ok | invalid | used | expired | own | taken(초대자가 이미 다른 사람과 연결됨)
-- inviter_name: ok·taken·expired·used 일 때 초대자 닉네임, 그 외 null
create or replace function public.invite_preview(token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  inv  public.couple_invites;
  name text;
begin
  select * into inv from public.couple_invites where invite_token = token;
  if inv.id is null then
    return jsonb_build_object('state', 'invalid', 'inviter_name', null);
  end if;
  if inv.created_by = auth.uid() then
    return jsonb_build_object('state', 'own', 'inviter_name', null);
  end if;

  select nickname into name from public.users where id = inv.created_by;

  if inv.used_at is not null then
    return jsonb_build_object('state', 'used', 'inviter_name', name);
  end if;
  if inv.expires_at <= now() then
    return jsonb_build_object('state', 'expired', 'inviter_name', name);
  end if;
  if exists (
    select 1 from public.couples
    where status = 'active'
      and (user_a_id = inv.created_by or user_b_id = inv.created_by)
  ) then
    return jsonb_build_object('state', 'taken', 'inviter_name', name);
  end if;
  return jsonb_build_object('state', 'ok', 'inviter_name', name);
end;
$$;

revoke execute on function public.invite_preview(text) from public, anon;
grant execute on function public.invite_preview(text) to authenticated;
