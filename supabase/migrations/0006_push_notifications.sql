-- 0006_push_notifications.sql
-- 상대 흔적 푸시 알림 — 상대가 장소/반응/메모/스티커를 남기면 내 기기로 Expo 푸시를 보낸다.
-- 구조: AFTER INSERT 트리거 → notify_partner() → pg_net 으로 Expo Push API 직접 호출(Edge Function 없음).
--   Expo Push API(https://exp.host/--/api/v2/push/send)는 기본 설정에서 인증이 필요 없어 DB 에 비밀값을 두지 않는다.
-- 알림 data = { boardId, boardTitle, placeId, lat, lng } → 앱이 탭 시 그 보드·핀으로 이동한다.
-- 주의: 초안. 실제 DB 적용은 별도 절차(SUPABASE_SETUP.md §3 방식)로 수행한다.
-- 재실행: 테이블은 if not exists, 함수는 or replace, 트리거는 drop if exists 후 생성 → 재실행 안전.

-- ============================================================
-- 0. pg_net (비동기 HTTP). 함수는 net 스키마에 생성된다.
-- ============================================================
create extension if not exists pg_net with schema extensions;

-- ============================================================
-- 1. 기기 푸시 토큰 (Expo push token, 기기당 1행)
-- ============================================================
create table if not exists public.push_tokens (
  token      text primary key,
  user_id    uuid not null references public.users(id) on delete cascade,
  platform   text not null check (platform in ('ios', 'android')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_push_tokens_user on public.push_tokens(user_id);

-- RLS 활성 + 정책 없음 → 클라이언트 직접 접근 불가. 등록/해제는 아래 RPC(SECURITY DEFINER)로만.
alter table public.push_tokens enable row level security;

-- 등록: 같은 기기 토큰이 다른 계정에 있으면(로그아웃 후 다른 계정 로그인) 현재 계정으로 옮긴다.
create or replace function public.register_push_token(p_token text, p_platform text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  insert into public.push_tokens (token, user_id, platform)
  values (p_token, auth.uid(), p_platform)
  on conflict (token) do update
    set user_id = excluded.user_id,
        platform = excluded.platform,
        updated_at = now();
end;
$$;

-- 해제: 로그아웃 시 본인 토큰만 삭제(다른 계정으로 알림이 새지 않게).
create or replace function public.unregister_push_token(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.push_tokens where token = p_token and user_id = auth.uid();
end;
$$;

grant execute on function public.register_push_token(text, text) to authenticated;
grant execute on function public.unregister_push_token(text) to authenticated;

-- ============================================================
-- 2. 알림 묶기(스팸 방지): (받는 사람, 보드, 종류)별 마지막 발송 시각
-- ============================================================
create table if not exists public.push_throttle (
  user_id      uuid not null references public.users(id) on delete cascade,
  board_id     uuid not null references public.boards(id) on delete cascade,
  kind         text not null,
  last_sent_at timestamptz not null,
  primary key (user_id, board_id, kind)
);

alter table public.push_throttle enable row level security; -- 정책 없음(내부 전용)

-- ============================================================
-- 3. 상대에게 알림 보내기 (트리거 전용 — 클라이언트 실행 권한 회수)
-- ============================================================
-- p_throttle: 같은 (받는 사람, 보드, 종류) 알림의 최소 간격. 스티커 연타·반응 토글이 알림 폭탄이 되지 않게.
create or replace function public.notify_partner(
  p_board_id uuid,
  p_actor    uuid,
  p_kind     text,
  p_body     text,
  p_place_id uuid,
  p_lat      double precision,
  p_lng      double precision,
  p_throttle interval
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  b         public.boards;
  ws        public.couples;
  recipient uuid;
  msgs      jsonb;
begin
  select * into b from public.boards where id = p_board_id;
  if b.id is null then
    return;
  end if;

  -- 연결된 커플(active)에서만 상대가 있다. 솔로/종료 워크스페이스는 보낼 대상이 없다.
  select * into ws from public.couples where id = b.couple_id and status = 'active';
  if ws.id is null then
    return;
  end if;

  recipient := case when ws.user_a_id = p_actor then ws.user_b_id else ws.user_a_id end;
  if recipient is null or recipient = p_actor then
    return;
  end if;

  -- 간격 안이면 갱신되지 않아 found = false → 발송 생략.
  insert into public.push_throttle (user_id, board_id, kind, last_sent_at)
  values (recipient, p_board_id, p_kind, now())
  on conflict (user_id, board_id, kind) do update
    set last_sent_at = now()
    where public.push_throttle.last_sent_at < now() - p_throttle;
  if not found then
    return;
  end if;

  select jsonb_agg(jsonb_build_object(
           'to', t.token,
           'title', b.title,
           'body', p_body,
           'sound', 'default',
           'channelId', 'default',
           'data', jsonb_build_object(
             'boardId', p_board_id,
             'boardTitle', b.title,
             'placeId', p_place_id,
             'lat', p_lat,
             'lng', p_lng
           )
         ))
    into msgs
    from public.push_tokens t
   where t.user_id = recipient;
  if msgs is null then
    return; -- 상대가 알림을 허용한 기기가 없음
  end if;

  perform net.http_post(
    url := 'https://exp.host/--/api/v2/push/send',
    body := msgs,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Accept', 'application/json')
  );
end;
$$;

-- Supabase 는 public 함수에 anon/authenticated 실행 권한을 기본 부여한다 → 트리거 전용으로 회수.
revoke execute on function public.notify_partner(uuid, uuid, text, text, uuid, double precision, double precision, interval)
  from public, anon, authenticated;

-- 작성자 표시 이름(알림 본문용).
create or replace function public.push_actor_name(p_user uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select nickname from public.users where id = p_user), '상대');
$$;

revoke execute on function public.push_actor_name(uuid) from public, anon, authenticated;

-- ============================================================
-- 4. 트리거 함수 — 알림 실패가 원래 쓰기를 막지 않도록 예외는 삼킨다.
-- ============================================================

-- 4.1 반응: "지수 ❤️ 성수 카페"
create or replace function public.trg_push_place_reaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.places;
begin
  select * into p from public.places where id = new.place_id;
  perform public.notify_partner(
    p.board_id, new.user_id, 'reaction',
    public.push_actor_name(new.user_id) || ' '
      || case new.reaction_type
           when 'love' then '❤️' when 'lol' then '😂' when 'nope' then '🤮' when 'wow' then '👀'
           else '' end
      || ' ' || p.name,
    p.id, p.latitude, p.longitude, interval '60 seconds'
  );
  return new;
exception when others then
  return new;
end;
$$;

-- 4.2 한 줄 메모: "지수 💬 성수 카페: 여기 웨이팅 있대" (대화라 간격을 짧게)
create or replace function public.trg_push_place_memo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.places;
begin
  select * into p from public.places where id = new.place_id;
  perform public.notify_partner(
    p.board_id, new.user_id, 'memo',
    public.push_actor_name(new.user_id) || ' 💬 ' || p.name || ': ' || left(new.content, 80),
    p.id, p.latitude, p.longitude, interval '10 seconds'
  );
  return new;
exception when others then
  return new;
end;
$$;

-- 4.3 장소 추가: "지수 📍 성수 카페 추가"
create or replace function public.trg_push_place()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.notify_partner(
    new.board_id, new.created_by, 'place',
    public.push_actor_name(new.created_by) || ' 📍 ' || new.name || ' 추가',
    new.id, new.latitude, new.longitude, interval '60 seconds'
  );
  return new;
exception when others then
  return new;
end;
$$;

-- 4.4 스티커: "지수 ✨ ☕ 스티커" (장소 비종속 → 좌표로 이동)
create or replace function public.trg_push_map_object()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.notify_partner(
    new.board_id, new.created_by, 'sticker',
    public.push_actor_name(new.created_by) || ' ✨ ' || coalesce(new.payload ->> 'emoji', '') || ' 스티커',
    null, new.latitude, new.longitude, interval '60 seconds'
  );
  return new;
exception when others then
  return new;
end;
$$;

revoke execute on function public.trg_push_place_reaction() from public, anon, authenticated;
revoke execute on function public.trg_push_place_memo() from public, anon, authenticated;
revoke execute on function public.trg_push_place() from public, anon, authenticated;
revoke execute on function public.trg_push_map_object() from public, anon, authenticated;

-- ============================================================
-- 5. 트리거 연결 (AFTER INSERT — 수정/삭제는 알리지 않는다)
-- ============================================================
drop trigger if exists trg_place_reactions_push on public.place_reactions;
create trigger trg_place_reactions_push
  after insert on public.place_reactions
  for each row execute function public.trg_push_place_reaction();

drop trigger if exists trg_place_memos_push on public.place_memos;
create trigger trg_place_memos_push
  after insert on public.place_memos
  for each row execute function public.trg_push_place_memo();

drop trigger if exists trg_places_push on public.places;
create trigger trg_places_push
  after insert on public.places
  for each row execute function public.trg_push_place();

drop trigger if exists trg_map_objects_push on public.map_objects;
create trigger trg_map_objects_push
  after insert on public.map_objects
  for each row execute function public.trg_push_map_object();
