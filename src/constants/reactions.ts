import type { ReactionType } from '../types/models';

// 반응 type → 표시 이모지. DB는 type 문자열만 저장하고, 이모지는 UI 파생값이다.
// (0003_reaction_types.sql 의 CHECK 집합과 1:1 대응)
// nope 은 원래 🤮 였는데, 같이 고르는 지도에서 "별로"를 말하기엔 너무 세서 🙅 로 바꿨다(2026-10-31).
export const REACTION_EMOJI: Record<ReactionType, string> = {
  love: '❤️',
  lol: '😂',
  nope: '🙅',
  wow: '👀',
};

// 화면 읽기 프로그램이 읽는 이름(이모지 대신)
export const REACTION_LABEL: Record<ReactionType, string> = {
  love: '좋아',
  lol: '웃겨',
  nope: '별로',
  wow: '궁금해',
};

// 반응 팔레트 노출 순서.
export const REACTION_ORDER: ReactionType[] = ['love', 'lol', 'nope', 'wow'];
