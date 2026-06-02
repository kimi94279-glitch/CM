-- 0002_solo_workspace.sql
-- Solo Mode: couples 를 "1~2인 워크스페이스"로 일반화한다. (A안)
-- - 솔로 진입: status='solo', user_b_id=NULL 인 워크스페이스 생성
-- - 커플 연결: 초대 수락 시 기존 솔로 워크스페이스를 'active'로 승격(데이터 유지)
-- 주의: 초안. 실제 DB 적용은 별도 절차로 수행한다. row 백필 없음(기존 active 커플 영향 없음).

-- ============================================================
-- 1. couples 스키마 확장
-- ============================================================
-- 솔로 워크스페이스는 상대가 아직 없다.
alter table public.couples alter column user_b_id drop not null;

-- status 에 'solo' 추가 (기존 무명 CHECK 제거 후 재정의)
alter table public.couples drop constraint if exists couples_status_check;
alter table public.couples
  add constraint couples_status_check check (status in ('solo', 'active', 'ended'));

-- 참고: couples_distinct_members (user_a_id <> user_b_id) 는 user_b_id 가 NULL 이면
--       결과가 NULL 이라 제약을 위반하지 않는다. 별도 변경 불필요.

-- ============================================================
-- 2. 솔로 워크스페이스 생성 RPC
--    (couples 직접 INSERT 정책이 없으므로 SECURITY DEFINER 로 생성)
-- ============================================================
create or replace function public.create_solo_workspace()
returns public.couples
language plpgsql
security definer
set search_path = public
as $$
declare
  ws public.couples;
begin
  -- 단일 워크스페이스 규칙: 이미 solo/active 워크스페이스가 있으면 거부
  if exists (
    select 1 from public.couples
    where status in ('solo', 'active')
      and (user_a_id = auth.uid() or user_b_id = auth.uid())
  ) then
    raise exception 'user already has a workspace';
  end if;

  insert into public.couples (user_a_id, user_b_id, status)
  values (auth.uid(), null, 'solo')
  returning * into ws;

  return ws;
end;
$$;

grant execute on function public.create_solo_workspace() to authenticated;

-- ============================================================
-- 3. accept_invite 재정의 (솔로 워크스페이스 승격 의미)
-- ============================================================
-- 동작:
--  - 수락자가 active 커플이면 거부
--  - 수락자가 비어있는(보드 0개) solo 워크스페이스면 제거 후 합류
--  - 수락자의 solo 워크스페이스에 데이터가 있으면 거부(향후 병합 기능)
--  - 초대자가 solo 워크스페이스면 그 행을 active 로 승격(데이터 유지)
--  - 초대자가 워크스페이스가 없으면 새 active 커플 생성
create or replace function public.accept_invite(token text)
returns public.couples
language plpgsql
security definer
set search_path = public
as $$
declare
  inv                  public.couple_invites;
  acceptor             uuid := auth.uid();
  acceptor_ws          public.couples;
  inviter_ws           public.couples;
  result_ws            public.couples;
  acceptor_board_count integer;
begin
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

  -- 수락자의 기존 워크스페이스 점검
  select * into acceptor_ws
  from public.couples
  where status in ('solo', 'active')
    and (user_a_id = acceptor or user_b_id = acceptor)
  limit 1;

  if acceptor_ws.id is not null then
    if acceptor_ws.status = 'active' then
      raise exception 'already in an active couple';
    end if;
    -- solo: 데이터가 있으면 합칠 수 없음(향후 병합 기능)
    select count(*) into acceptor_board_count
    from public.boards
    where couple_id = acceptor_ws.id;
    if acceptor_board_count > 0 then
      raise exception 'acceptor has solo data';
    end if;
    -- 비어있는 솔로 워크스페이스는 제거하고 초대자 워크스페이스에 합류
    delete from public.couples where id = acceptor_ws.id;
  end if;

  -- 초대자의 워크스페이스 점검
  select * into inviter_ws
  from public.couples
  where status in ('solo', 'active')
    and (user_a_id = inv.created_by or user_b_id = inv.created_by)
  limit 1;

  if inviter_ws.id is not null then
    if inviter_ws.status = 'active' then
      raise exception 'inviter already coupled';
    end if;
    -- 초대자의 솔로 워크스페이스를 커플로 승격 (데이터 유지)
    update public.couples
    set user_b_id = acceptor,
        status = 'active',
        updated_at = now()
    where id = inviter_ws.id
    returning * into result_ws;
  else
    -- 초대자가 워크스페이스가 없으면 새 active 커플 생성
    insert into public.couples (user_a_id, user_b_id, status)
    values (inv.created_by, acceptor, 'active')
    returning * into result_ws;
  end if;

  update public.couple_invites
  set used_at = now(),
      updated_at = now()
  where id = inv.id;

  return result_ws;
end;
$$;

grant execute on function public.accept_invite(text) to authenticated;
