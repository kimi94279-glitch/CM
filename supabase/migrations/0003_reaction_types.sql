-- 0003_reaction_types.sql
-- Canvas MVP (장소 중심 반응 누적) — place_reactions.reaction_type 를 banter형으로 확대.
-- 근거: ADR-013 / ADR-014. H2(상대 반응이 내 행동을 바꾸는가) 점화에는 '대조' 반응이 필요하다.
-- 주의: 초안. 실제 DB 적용은 별도 절차(SUPABASE_SETUP.md §3 방식)로 수행한다.
-- 안전성: 현재 reaction_type 사용처/데이터 없음(코드 0 참조) → 값 집합 재정의 안전.
--   UI 매핑(미저장): love→❤️  lol→😂  nope→🤮  wow→👀

-- 0001 의 인라인 컬럼 CHECK 는 자동명명된다: place_reactions_reaction_type_check
-- (이름 확인이 필요하면:
--   select conname from pg_constraint
--   where conrelid = 'public.place_reactions'::regclass and contype = 'c';)
alter table public.place_reactions
  drop constraint if exists place_reactions_reaction_type_check;

alter table public.place_reactions
  add constraint place_reactions_reaction_type_check
  check (reaction_type in ('love', 'lol', 'nope', 'wow'));
