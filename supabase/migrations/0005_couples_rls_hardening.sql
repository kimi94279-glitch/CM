-- 0005_couples_rls_hardening.sql
-- couples 권한 강화 — 멤버의 직접 UPDATE 차단 + 종료(ended) 워크스페이스 접근 차단.
-- 주의: 초안. 실제 DB 적용은 별도 절차(SUPABASE_SETUP.md §3 방식)로 수행한다.
-- 클라이언트 영향: couples 는 조회(select)만 한다(coupleService). 생성/승격은 RPC(SECURITY DEFINER) 경유라 무영향.

-- ============================================================
-- 1. couples 직접 UPDATE 정책 제거
-- ============================================================
-- 0001 의 couples_update 는 멤버에게 모든 컬럼 수정을 허용했다
-- (user_b_id=null 로 상대 제거, ended→active 부활, 임의 uid 주입 가능).
-- 상태 전환(관계 종료 등)은 이후 전용 RPC(SECURITY DEFINER)로만 제공한다.
drop policy if exists couples_update on public.couples;

-- ============================================================
-- 2. is_member_of_couple: 살아있는 워크스페이스(solo/active)만 멤버로 인정
-- ============================================================
-- 기존 정의는 status 를 보지 않아, ended 커플의 전 멤버도 boards/places/memos/
-- reactions/map_objects 를 API로 계속 읽고/쓰고/지울 수 있었다.
-- 이 함수를 쓰는 모든 RLS 정책에 즉시 반영된다(정책 재생성 불필요).
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
      and status in ('solo', 'active')
      and (user_a_id = auth.uid() or user_b_id = auth.uid())
  );
$$;
