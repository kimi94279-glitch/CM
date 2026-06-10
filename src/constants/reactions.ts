import type { ReactionType } from '../types/models';

// 반응 type → 표시 이모지. DB는 type 문자열만 저장하고, 이모지는 UI 파생값이다.
// (0003_reaction_types.sql 의 CHECK 집합과 1:1 대응)
export const REACTION_EMOJI: Record<ReactionType, string> = {
  love: '❤️',
  lol: '😂',
  nope: '🤮',
  wow: '👀',
};

// 반응 팔레트 노출 순서.
export const REACTION_ORDER: ReactionType[] = ['love', 'lol', 'nope', 'wow'];
