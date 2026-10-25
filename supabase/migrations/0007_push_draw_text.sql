-- 0007_push_draw_text.sql
-- 펜 그림(map_objects.type = 'draw') 알림 문구 — 0006 의 스티커 문구("✨ (빈) 스티커")가 그림에도 나가던 것을 고친다.
-- 그림은 종류(kind) 'draw' 로 따로 묶어, 스티커와 알림 간격(60초)을 따로 센다.
-- 주의: 초안. 실제 DB 적용은 별도 절차(SUPABASE_SETUP.md §3 방식)로 수행한다. 재실행 안전(or replace).

create or replace function public.trg_push_map_object()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.notify_partner(
    new.board_id, new.created_by,
    case when new.type = 'draw' then 'draw' else 'sticker' end,
    public.push_actor_name(new.created_by)
      || case
           when new.type = 'draw' then ' ✏️ 지도에 낙서'
           else ' ✨ ' || coalesce(new.payload ->> 'emoji', '') || ' 스티커'
         end,
    null, new.latitude, new.longitude, interval '60 seconds'
  );
  return new;
exception when others then
  return new;
end;
$$;

revoke execute on function public.trg_push_map_object() from public, anon, authenticated;
