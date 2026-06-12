-- 0004_map_objects.sql
-- Infinite Geographic Canvas — 지리 고정 객체(Place 비종속). ADR-008 Option B / MAP CANVAS §2~3.
-- P0 는 sticker 만 사용하지만, 향후 text/arrow/draw 확장 위해 type/payload/zoom_level 을 포함한다.
-- zoom_level: 생성 당시 Kakao map.getLevel() (LOD 키). P0 에서는 저장만 하고 렌더 정책에 쓰지 않는다.
-- 주의: 초안. 실제 DB 적용은 별도 절차(SUPABASE_SETUP.md §3 방식)로 수행한다.

create table public.map_objects (
  id          uuid primary key default gen_random_uuid(),
  board_id    uuid not null references public.boards(id) on delete cascade,
  type        text not null check (type in ('text', 'sticker', 'arrow', 'draw')),
  latitude    double precision not null,   -- 앵커(text/sticker=점, arrow=시작점, draw=대표점)
  longitude   double precision not null,
  zoom_level  integer not null,            -- 생성 당시 줌 레벨(LOD 키; P0 렌더 미사용)
  payload     jsonb not null default '{}', -- sticker{emoji} / text{text} / arrow{toLat,toLng} / draw{points}
  created_by  uuid not null references public.users(id) on delete restrict,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_map_objects_board on public.map_objects(board_id);
create index idx_map_objects_created_by on public.map_objects(created_by);

create trigger trg_map_objects_updated_at
  before update on public.map_objects
  for each row execute function public.set_updated_at();

-- RLS: places 와 동일하게 board→couple 멤버 전 권한(상호 가시성·삭제정합 동일 보장).
alter table public.map_objects enable row level security;

create policy map_objects_select on public.map_objects
  for select using (
    exists (select 1 from public.boards b
            where b.id = map_objects.board_id and public.is_member_of_couple(b.couple_id))
  );

create policy map_objects_insert on public.map_objects
  for insert with check (
    exists (select 1 from public.boards b
            where b.id = map_objects.board_id and public.is_member_of_couple(b.couple_id))
  );

create policy map_objects_update on public.map_objects
  for update using (
    exists (select 1 from public.boards b
            where b.id = map_objects.board_id and public.is_member_of_couple(b.couple_id))
  ) with check (
    exists (select 1 from public.boards b
            where b.id = map_objects.board_id and public.is_member_of_couple(b.couple_id))
  );

create policy map_objects_delete on public.map_objects
  for delete using (
    exists (select 1 from public.boards b
            where b.id = map_objects.board_id and public.is_member_of_couple(b.couple_id))
  );
