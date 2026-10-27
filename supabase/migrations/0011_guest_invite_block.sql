-- 0011_guest_invite_block.sql
-- 로그인 없이 시작(게스트): 앱은 Supabase 익명 세션(auth.users.is_anonymous)으로 지도를 저장한다.
-- 게스트도 기본 기능(지도·그리기·메모·반응)은 다 쓰지만, 같이 그리기(초대 만들기·미리보기·받기)는 로그인해야 한다.
-- 앱에서 막는 것(LoginRequired)에 더해 서버에서도 막는다. 로그인(카카오·Apple 연결)하면 같은 사용자라 지도가 그대로 이어진다.
-- 주의: 초안. 실제 DB 적용은 별도 절차(SUPABASE_SETUP.md §3 방식)로 수행한다. 재실행 안전.

-- ============================================================
-- 1. 로그인한 사람(익명 세션 아님)인지
-- ============================================================
-- JWT 의 is_anonymous 클레임. JWT 가 없으면(서비스 역할 등) 로그인한 것으로 본다 — 비로그인(anon)은 auth.uid() 로 따로 막는다.
create or replace function public.is_permanent_user()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
$$;

-- ============================================================
-- 2. 초대 만들기: 게스트는 couple_invites INSERT 불가 (기존 허용 정책에 덧붙는 제한 정책)
-- ============================================================
drop policy if exists couple_invites_insert_permanent on public.couple_invites;
create policy couple_invites_insert_permanent on public.couple_invites
  as restrictive
  for insert
  to authenticated
  with check (public.is_permanent_user());

-- ============================================================
-- 3. 초대 받기·미리보기: 게스트 거부 (0008 정의 + 로그인 확인)
-- ============================================================
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
  -- 0011: 로그인 없이 쓰는 사람(익명 세션)은 같이 그리기 불가
  if not public.is_permanent_user() then
    raise exception 'login required';
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
  -- 0011: 로그인 없이 쓰는 사람(익명 세션)은 같이 그리기 불가
  if not public.is_permanent_user() then
    raise exception 'login required';
  end if;

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
