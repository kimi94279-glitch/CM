-- 0014_poi_matching.sql
-- 장소 정본 = 공공데이터(ADR-016 Option D′, 설계 docs/Place Matching.md).
--   카카오 검색은 찾기(화면 표시)와 매칭 조회 키로만 쓴다. 저장은 공공데이터 레코드 또는 사용자 핀 + 카카오 장소 ID(링크)만.
--   poi       = 소상공인시장진흥공단 상가(상권)정보(이용허락범위 제한 없음). 분기마다 다시 적재한다.
--   poi_dongs = 법정동별 중심(우리 데이터 평균 좌표) — 매칭이 안 될 때 지도를 그 동네까지만 옮기는 데 쓴다.
--   두 표 모두 RLS on + 정책 없음 + anon/authenticated 권한 회수 → 앱은 직접 못 읽는다. place-search(service role) 만 poi_lookup 으로 읽는다.
--   places    = provider 'public'(poi 레코드) 추가, kakao_place_id(카카오맵 링크용 장소 ID 단독) 추가. 'kakao'·'naver' 는 레거시(새로 안 만듦).
-- 주의: 초안. 실제 DB 적용은 별도 절차(SUPABASE_SETUP.md §3 방식)로 수행한다. 재실행 안전.

-- ============================================================
-- 1. poi — 공공데이터 장소
-- ============================================================
create table if not exists public.poi (
  id           text primary key,                 -- 상가업소번호 (다른 출처는 'osm:node/123' 식 접두어)
  source       text not null default 'sbiz',     -- 'sbiz' = 상가(상권)정보
  name         text not null,                    -- 상호명
  branch       text,                             -- 지점명
  category     text,                             -- 상권업종소분류명
  sigungu      text not null,                    -- 시군구명
  bdong        text not null,                    -- 법정동명
  road_address text,                             -- 도로명주소
  lat          double precision not null,
  lng          double precision not null,
  data_date    date not null                     -- 데이터 기준일(분기)
);

create index if not exists poi_geo on public.poi using gist ((point(lng, lat)));

create table if not exists public.poi_dongs (
  sigungu text not null,
  bdong   text not null,
  lat     double precision not null,
  lng     double precision not null,
  n       integer not null,
  primary key (sigungu, bdong)
);

alter table public.poi enable row level security;
alter table public.poi_dongs enable row level security;
revoke all on public.poi, public.poi_dongs from anon, authenticated;

-- ============================================================
-- 2. poi_lookup — 매칭 후보 + 동네 중심 (place-search 의 match 가 한 번에 부른다)
--    p_lat/p_lng/p_sigungu/p_bdong 은 카카오 결과에서 온 조회 키 — 여기서 쓰고 버린다(저장·로그 없음).
--    동네: 시군구·법정동이 poi_dongs 에 있으면 그 중심, 없으면 3km 안에서 가장 가까운 동네 중심, 그것도 없으면 null.
-- ============================================================
create or replace function public.poi_lookup(
  p_lat double precision,
  p_lng double precision,
  p_sigungu text default null,
  p_bdong text default null,
  p_radius_m integer default 150
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with k as (
    select least(greatest(coalesce(p_radius_m, 150), 10), 500) / 110540.0 as dlat,
           least(greatest(coalesce(p_radius_m, 150), 10), 500) / (111320.0 * cos(radians(p_lat))) as dlng
  )
  select jsonb_build_object(
    'candidates', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', c.id, 'name', c.name, 'branch', c.branch, 'category', c.category,
               'address', c.road_address, 'lat', c.lat, 'lng', c.lng))
      from (
        select p.*
        from public.poi p, k
        where point(p.lng, p.lat) <@ box(point(p_lng - k.dlng, p_lat - k.dlat), point(p_lng + k.dlng, p_lat + k.dlat))
        order by point(p.lng, p.lat) <-> point(p_lng, p_lat)
        limit 60
      ) c
    ), '[]'::jsonb),
    'dong', coalesce(
      (select jsonb_build_object('name', d.bdong, 'lat', d.lat, 'lng', d.lng)
       from public.poi_dongs d
       where d.sigungu = p_sigungu and d.bdong = p_bdong),
      (select jsonb_build_object('name', d.bdong, 'lat', d.lat, 'lng', d.lng)
       from public.poi_dongs d
       where abs(d.lat - p_lat) < 0.03 and abs(d.lng - p_lng) < 0.035
       order by point(d.lng, d.lat) <-> point(p_lng, p_lat)
       limit 1)
    )
  );
$$;

revoke all on function public.poi_lookup(double precision, double precision, text, text, integer) from public, anon, authenticated;
grant execute on function public.poi_lookup(double precision, double precision, text, text, integer) to service_role;

-- ============================================================
-- 3. poi_dongs 다시 계산 (적재 뒤 실행 — service role / SQL Editor)
-- ============================================================
create or replace function public.poi_rebuild_dongs()
returns integer
language sql
security definer
set search_path = public
as $$
  delete from public.poi_dongs;
  insert into public.poi_dongs (sigungu, bdong, lat, lng, n)
  select sigungu, bdong, avg(lat), avg(lng), count(*)::integer
  from public.poi
  group by sigungu, bdong;
  select count(*)::integer from public.poi_dongs;
$$;

revoke all on function public.poi_rebuild_dongs() from public, anon, authenticated;

-- ============================================================
-- 4. places — provider 'public' + 카카오 장소 ID 단독 칸
-- ============================================================
alter table public.places add column if not exists kakao_place_id text;

alter table public.places drop constraint if exists places_kakao_place_id_check;
alter table public.places
  add constraint places_kakao_place_id_check check (kakao_place_id ~ '^[0-9]{1,20}$');

do $$
declare
  c text;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.places'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%provider %'
  loop
    execute format('alter table public.places drop constraint %I', c);
  end loop;
end;
$$;

alter table public.places
  add constraint places_provider_check check (provider in ('public', 'manual', 'kakao', 'naver'));

-- public 이면 poi 레코드 ID(상가업소번호)가 있어야 한다. (외래 키는 두지 않는다 — 분기 갱신으로 poi 에서 빠져도 핀은 남는다)
alter table public.places drop constraint if exists places_public_ref_check;
alter table public.places
  add constraint places_public_ref_check check (provider is distinct from 'public' or provider_place_id is not null);
