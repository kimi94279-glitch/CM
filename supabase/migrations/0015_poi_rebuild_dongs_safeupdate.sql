-- 0015_poi_rebuild_dongs_safeupdate.sql
-- poi_rebuild_dongs() 를 REST(service role — scripts/poi-import/refresh_poi.py)로 부르면
-- Supabase 의 pg_safeupdate 가 WHERE 없는 DELETE 를 막아 실패했다("DELETE requires a WHERE clause", 2026-10-28 첫 적재).
-- 전체 삭제에 where true 를 붙인다. 동작은 같다.
-- 주의: 초안. 실제 DB 적용은 별도 절차(SUPABASE_SETUP.md §3 방식)로 수행한다. 재실행 안전.

create or replace function public.poi_rebuild_dongs()
returns integer
language sql
security definer
set search_path = public
as $$
  delete from public.poi_dongs where true;
  insert into public.poi_dongs (sigungu, bdong, lat, lng, n)
  select sigungu, bdong, avg(lat), avg(lng), count(*)::integer
  from public.poi
  group by sigungu, bdong;
  select count(*)::integer from public.poi_dongs;
$$;

revoke all on function public.poi_rebuild_dongs() from public, anon, authenticated;
