-- 0016_place_kakao_live.sql
-- 카카오 실시간 핀(ADR-016 하이브리드, docs/Place Matching.md §11).
--   공공데이터(poi)와 맞는 곳은 지금처럼 공공 레코드로 저장하고, 맞지 않는 곳은 카카오 장소를 "실시간 핀"으로 둔다:
--   저장 = 카카오 장소 ID(kakao_place_id) + 사용자가 친 검색어(live_query) + 이름(사용자가 붙인 이름, 없으면 검색어)
--          + 자리표시 좌표(우리 데이터의 동네 중심 — 카카오 좌표가 아님).
--   표시 = 볼 때마다 place-search(resolve)로 카카오를 다시 불러 그 순간의 좌표·이름으로 그린다(앱 메모리에만, 저장 없음).
--   카카오 측 답변(데브톡 151294): "좌표를 별도로 저장하지 않고, 화면 노출 시점마다 로컬 API를 실시간 호출하여 응답받은 좌표를
--   지도에 표시하는 방식은 허용" · 151647: 장소 ID 단독 저장 허용.
-- 예전 provider 'kakao'·'naver' 는 남은 행이 없어(2026-10-28 정리) 뺀다.
-- 주의: 초안. 실제 DB 적용은 별도 절차(SUPABASE_SETUP.md §3 방식)로 수행한다. 재실행 안전.

alter table public.places add column if not exists live_query text;

do $$
declare
  c text;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.places'::regclass
      and contype = 'c'
      and conname in ('places_provider_check', 'places_live_check')
  loop
    execute format('alter table public.places drop constraint %I', c);
  end loop;
end;
$$;

alter table public.places
  add constraint places_provider_check check (provider in ('public', 'manual', 'kakao_live'));

-- 실시간 핀은 카카오 장소 ID 와 다시 찾을 검색어가 있어야 한다(검색어는 사용자가 입력한 글자 — 100자 이내).
alter table public.places
  add constraint places_live_check check (
    provider is distinct from 'kakao_live'
    or (kakao_place_id is not null and live_query is not null and char_length(live_query) between 1 and 100)
  );
