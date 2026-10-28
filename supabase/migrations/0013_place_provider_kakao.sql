-- 0013_place_provider_kakao.sql
-- 장소 출처(places.provider) 정리 — ADR-016 Option C.
--   kakao  = 카카오 검색으로 찾아 "사용자가 위치·이름을 확정한" 핀. provider_place_id 는 카카오맵 링크용 장소 ID.
--   manual = 사용자가 지도에 직접 찍은 핀.
--   naver  = 예전 방식(레거시, 새로 만들지 않음).
-- 운영 DB 는 레포에 없는 변경으로 이미 kakao 를 허용하고 있었다(드리프트). 이름이 무엇이든 provider CHECK 를 지우고 다시 만든다.
-- 주의: 초안. 실제 DB 적용은 별도 절차(SUPABASE_SETUP.md §3 방식)로 수행한다. 재실행 안전.

do $$
declare
  c text;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.places'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%provider%'
  loop
    execute format('alter table public.places drop constraint %I', c);
  end loop;
end;
$$;

alter table public.places
  add constraint places_provider_check check (provider in ('naver', 'manual', 'kakao'));
