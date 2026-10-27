-- 0009_board_activity.sql
-- 새 흔적 표시: 보드 목록에서 "상대가 마지막으로 본 뒤에 뭘 남겼는지" 보여준다.
--  1) board_reads: 사람별·보드별 마지막으로 본 시각
--  2) mark_board_read(board_id): 지금 봤다고 기록 (서버 시각)
--  3) board_activity(): 내 보드마다 안 본 상대 흔적 수 + 마지막 활동 시각
-- 흔적 = 장소·메모·반응·지도 객체(스티커·그림) 추가. 수정·삭제는 세지 않는다.
-- 주의: 초안. 실제 DB 적용은 별도 절차(SUPABASE_SETUP.md §3 방식)로 수행한다. 재실행 안전.

-- ============================================================
-- 1. board_reads
-- ============================================================
create table if not exists public.board_reads (
  board_id     uuid not null references public.boards(id) on delete cascade,
  user_id      uuid not null references public.users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (board_id, user_id)
);

alter table public.board_reads enable row level security;

-- 본인 기록만 읽는다. 쓰기는 mark_board_read 경유(직접 쓰기 정책 없음).
drop policy if exists board_reads_select on public.board_reads;
create policy board_reads_select on public.board_reads
  for select using (user_id = auth.uid());

-- ============================================================
-- 2. mark_board_read
-- ============================================================
create or replace function public.mark_board_read(p_board_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not exists (
    select 1 from public.boards b
    where b.id = p_board_id and public.is_member_of_couple(b.couple_id)
  ) then
    raise exception 'not a board member';
  end if;

  insert into public.board_reads (board_id, user_id, last_read_at)
  values (p_board_id, auth.uid(), now())
  on conflict (board_id, user_id) do update set last_read_at = excluded.last_read_at;
end;
$$;

revoke execute on function public.mark_board_read(uuid) from public, anon;
grant execute on function public.mark_board_read(uuid) to authenticated;

-- ============================================================
-- 3. board_activity — 호출자 권한(RLS)으로 읽으므로 내 공간 보드만 나온다
-- ============================================================
-- unread: 내가 마지막으로 본 뒤 상대가 남긴 흔적 수 (한 번도 안 본 보드면 상대 흔적 전부)
-- last_activity_at: 누구든 마지막으로 흔적을 남긴 시각 (없으면 null)
create or replace function public.board_activity()
returns table (board_id uuid, unread integer, last_activity_at timestamptz)
language sql
stable
security invoker
set search_path = public
as $$
  with acts as (
    select p.board_id, p.created_by as actor, p.created_at
    from public.places p
    union all
    select p.board_id, m.user_id, m.created_at
    from public.place_memos m join public.places p on p.id = m.place_id
    union all
    select p.board_id, r.user_id, r.created_at
    from public.place_reactions r join public.places p on p.id = r.place_id
    union all
    select o.board_id, o.created_by, o.created_at
    from public.map_objects o
  )
  select
    b.id,
    (count(a.created_at) filter (
      where a.actor <> auth.uid()
        and a.created_at > coalesce(br.last_read_at, '-infinity'::timestamptz)
    ))::integer,
    max(a.created_at)
  from public.boards b
  left join public.board_reads br on br.board_id = b.id and br.user_id = auth.uid()
  left join acts a on a.board_id = b.id
  group by b.id;
$$;

revoke execute on function public.board_activity() from public, anon;
grant execute on function public.board_activity() to authenticated;
