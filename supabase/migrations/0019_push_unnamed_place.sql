-- 0019_push_unnamed_place.sql
-- 이름 없는 핀(2026-11-05 핀 도구 "바로 꽂기" — 이름은 나중에 붙인다) 알림 문구:
-- 0006 문구 "지수 📍 {이름} 추가"가 이름이 비면 "지수 📍  추가"로 나가던 것을 "지수 📍 새 핀 추가"로 고친다.
-- 주의: 초안. 실제 DB 적용은 별도 절차(SUPABASE_SETUP.md §3 방식)로 수행한다. 재실행 안전(or replace).

create or replace function public.trg_push_place()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.notify_partner(
    new.board_id, new.created_by, 'place',
    public.push_actor_name(new.created_by) || ' 📍 '
      || coalesce(nullif(btrim(new.name), ''), '새 핀') || ' 추가',
    new.id, new.latitude, new.longitude, interval '60 seconds'
  );
  return new;
exception when others then
  return new;
end;
$$;

revoke execute on function public.trg_push_place() from public, anon, authenticated;
