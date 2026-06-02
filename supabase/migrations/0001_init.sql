-- 0001_init.sql
-- Couple Map 초기 스키마 (DATABASE.md 구현)
-- 주의: 이 파일은 초안이다. 실제 DB 적용은 별도 절차로 수행한다.
-- 설계 출처: DATABASE.md (테이블 7개 / FK / Cascade / RLS / accept_invite RPC)

-- ============================================================
-- 0. Extensions
-- ============================================================
create extension if not exists pgcrypto; -- gen_random_uuid()

-- ============================================================
-- 1. updated_at 자동 갱신 함수
--    (updated_at 컬럼을 가진 테이블의 UPDATE 시 갱신)
-- ============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- 2. Tables
-- ============================================================

-- 2.1 users (프로필) ── auth.users 참조
create table public.users (
  id            uuid primary key references auth.users(id) on delete cascade,
  nickname      text not null,
  profile_image text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 2.2 couples (active / ended 만 보관)
create table public.couples (
  id         uuid primary key default gen_random_uuid(),
  user_a_id  uuid not null references public.users(id) on delete restrict, -- 초대한 사람
  user_b_id  uuid not null references public.users(id) on delete restrict, -- 수락한 사람
  status     text not null default 'active' check (status in ('active', 'ended')),
  ended_at   timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint couples_distinct_members check (user_a_id <> user_b_id)
);

-- 2.3 couple_invites (couples를 참조하지 않는 독립 테이블)
create table public.couple_invites (
  id           uuid primary key default gen_random_uuid(),
  invite_token text not null unique,
  created_by   uuid not null references public.users(id) on delete restrict,
  expires_at   timestamptz not null,
  used_at      timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- 2.4 boards
create table public.boards (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references public.couples(id) on delete restrict,
  title      text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2.5 places
create table public.places (
  id                uuid primary key default gen_random_uuid(),
  board_id          uuid not null references public.boards(id) on delete cascade,
  name              text not null,
  latitude          double precision not null,
  longitude         double precision not null,
  provider          text check (provider in ('naver', 'manual')),
  provider_place_id text,
  order_index       integer not null default 0,
  created_by        uuid not null references public.users(id) on delete restrict,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint places_board_order_unique unique (board_id, order_index)
);

-- 2.6 place_memos
create table public.place_memos (
  id         uuid primary key default gen_random_uuid(),
  place_id   uuid not null references public.places(id) on delete cascade,
  user_id    uuid not null references public.users(id) on delete restrict,
  content    text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2.7 place_reactions (updated_at 없음: 생성/삭제만 존재)
create table public.place_reactions (
  id            uuid primary key default gen_random_uuid(),
  place_id      uuid not null references public.places(id) on delete cascade,
  user_id       uuid not null references public.users(id) on delete restrict,
  reaction_type text not null check (reaction_type in ('love', 'cafe', 'photo', 'mood')),
  created_at    timestamptz not null default now(),
  constraint place_reactions_unique unique (place_id, user_id, reaction_type)
);

-- ============================================================
-- 3. updated_at 트리거 (updated_at 보유 테이블에만)
-- ============================================================
create trigger trg_users_updated_at        before update on public.users          for each row execute function public.set_updated_at();
create trigger trg_couples_updated_at       before update on public.couples        for each row execute function public.set_updated_at();
create trigger trg_couple_invites_updated_at before update on public.couple_invites for each row execute function public.set_updated_at();
create trigger trg_boards_updated_at        before update on public.boards         for each row execute function public.set_updated_at();
create trigger trg_places_updated_at        before update on public.places         for each row execute function public.set_updated_at();
create trigger trg_place_memos_updated_at   before update on public.place_memos    for each row execute function public.set_updated_at();

-- ============================================================
-- 4. 인덱스 (FK 조회 성능 / RLS 조인 대비)
-- ============================================================
create index idx_couples_user_a       on public.couples(user_a_id);
create index idx_couples_user_b        on public.couples(user_b_id);
create index idx_couple_invites_created_by on public.couple_invites(created_by);
create index idx_boards_couple         on public.boards(couple_id);
create index idx_places_board          on public.places(board_id);
create index idx_places_created_by     on public.places(created_by);
create index idx_place_memos_place     on public.place_memos(place_id);
create index idx_place_memos_user      on public.place_memos(user_id);
create index idx_place_reactions_place on public.place_reactions(place_id);
create index idx_place_reactions_user  on public.place_reactions(user_id);

-- ============================================================
-- 5. Helper / RPC (SECURITY DEFINER)
-- ============================================================

-- 5.1 커플 멤버 여부
create or replace function public.is_member_of_couple(c uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.couples
    where id = c
      and (user_a_id = auth.uid() or user_b_id = auth.uid())
  );
$$;

-- 5.2 초대 수락 (couple 생성의 유일한 경로 / 단일 활성 커플 검증 지점)
create or replace function public.accept_invite(token text)
returns public.couples
language plpgsql
security definer
set search_path = public
as $$
declare
  inv        public.couple_invites;
  new_couple public.couples;
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
  if inv.created_by = auth.uid() then
    raise exception 'cannot accept own invite';
  end if;

  -- 단일 활성 커플 검증 (양측 모두 active 커플이 없어야 함)
  if exists (
    select 1
    from public.couples
    where status = 'active'
      and (
        user_a_id = auth.uid() or user_b_id = auth.uid()
        or user_a_id = inv.created_by or user_b_id = inv.created_by
      )
  ) then
    raise exception 'user already in an active couple';
  end if;

  insert into public.couples (user_a_id, user_b_id, status)
  values (inv.created_by, auth.uid(), 'active')
  returning * into new_couple;

  update public.couple_invites
  set used_at = now()
  where id = inv.id;

  return new_couple;
end;
$$;

-- ============================================================
-- 6. Row Level Security
-- ============================================================
alter table public.users           enable row level security;
alter table public.couples         enable row level security;
alter table public.couple_invites  enable row level security;
alter table public.boards          enable row level security;
alter table public.places          enable row level security;
alter table public.place_memos     enable row level security;
alter table public.place_reactions enable row level security;

-- 6.1 users : 본인 + 파트너 조회 / 본인 가입·수정 / 삭제 정책 없음
create policy users_select on public.users
  for select using (
    id = auth.uid()
    or exists (
      select 1 from public.couples c
      where (c.user_a_id = auth.uid() and c.user_b_id = public.users.id)
         or (c.user_b_id = auth.uid() and c.user_a_id = public.users.id)
    )
  );

create policy users_insert on public.users
  for insert with check (id = auth.uid());

create policy users_update on public.users
  for update using (id = auth.uid()) with check (id = auth.uid());

-- 6.2 couples : 멤버 조회 / INSERT는 accept_invite RPC 경유(직접 INSERT 정책 없음) / 멤버 UPDATE(ended 전환)
create policy couples_select on public.couples
  for select using (user_a_id = auth.uid() or user_b_id = auth.uid());

create policy couples_update on public.couples
  for update using (user_a_id = auth.uid() or user_b_id = auth.uid())
  with check (user_a_id = auth.uid() or user_b_id = auth.uid());

-- 6.3 couple_invites : created_by 본인만 전 권한
create policy couple_invites_select on public.couple_invites
  for select using (created_by = auth.uid());

create policy couple_invites_insert on public.couple_invites
  for insert with check (created_by = auth.uid());

create policy couple_invites_update on public.couple_invites
  for update using (created_by = auth.uid()) with check (created_by = auth.uid());

create policy couple_invites_delete on public.couple_invites
  for delete using (created_by = auth.uid());

-- 6.4 boards : 커플 멤버 전 권한
create policy boards_select on public.boards
  for select using (public.is_member_of_couple(couple_id));

create policy boards_insert on public.boards
  for insert with check (public.is_member_of_couple(couple_id));

create policy boards_update on public.boards
  for update using (public.is_member_of_couple(couple_id))
  with check (public.is_member_of_couple(couple_id));

create policy boards_delete on public.boards
  for delete using (public.is_member_of_couple(couple_id));

-- 6.5 places : 보드의 커플 멤버 전 권한
create policy places_select on public.places
  for select using (
    exists (select 1 from public.boards b
            where b.id = places.board_id and public.is_member_of_couple(b.couple_id))
  );

create policy places_insert on public.places
  for insert with check (
    exists (select 1 from public.boards b
            where b.id = places.board_id and public.is_member_of_couple(b.couple_id))
  );

create policy places_update on public.places
  for update using (
    exists (select 1 from public.boards b
            where b.id = places.board_id and public.is_member_of_couple(b.couple_id))
  ) with check (
    exists (select 1 from public.boards b
            where b.id = places.board_id and public.is_member_of_couple(b.couple_id))
  );

create policy places_delete on public.places
  for delete using (
    exists (select 1 from public.boards b
            where b.id = places.board_id and public.is_member_of_couple(b.couple_id))
  );

-- 6.6 place_memos : 멤버 조회 / 작성자 본인 작성·수정·삭제
create policy place_memos_select on public.place_memos
  for select using (
    exists (select 1 from public.places p
            join public.boards b on b.id = p.board_id
            where p.id = place_memos.place_id and public.is_member_of_couple(b.couple_id))
  );

create policy place_memos_insert on public.place_memos
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from public.places p
                join public.boards b on b.id = p.board_id
                where p.id = place_memos.place_id and public.is_member_of_couple(b.couple_id))
  );

create policy place_memos_update on public.place_memos
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy place_memos_delete on public.place_memos
  for delete using (user_id = auth.uid());

-- 6.7 place_reactions : 멤버 조회 / 본인 추가 / UPDATE 없음 / 본인 삭제
create policy place_reactions_select on public.place_reactions
  for select using (
    exists (select 1 from public.places p
            join public.boards b on b.id = p.board_id
            where p.id = place_reactions.place_id and public.is_member_of_couple(b.couple_id))
  );

create policy place_reactions_insert on public.place_reactions
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from public.places p
                join public.boards b on b.id = p.board_id
                where p.id = place_reactions.place_id and public.is_member_of_couple(b.couple_id))
  );

create policy place_reactions_delete on public.place_reactions
  for delete using (user_id = auth.uid());
