-- 0018_push_text_sticker.sql
-- 글자 스티커(map_objects.payload.text, 2026-11-01 스티커 서랍 "글자" 탭) 알림 문구 — 이모지가 없어서
-- 0007 문구로는 "✨  스티커"(빈칸)로 나가던 것을 "✨ “맛집” 스티커"로 고친다. 그 밖(그림·이모지 스티커)은 0007 그대로.
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
           else ' ✨ '
             || coalesce(
                  new.payload ->> 'emoji',
                  '“' || left(new.payload ->> 'text', 24) || '”',
                  ''
                )
             || ' 스티커'
         end,
    null, new.latitude, new.longitude, interval '60 seconds'
  );
  return new;
exception when others then
  return new;
end;
$$;

revoke execute on function public.trg_push_map_object() from public, anon, authenticated;
