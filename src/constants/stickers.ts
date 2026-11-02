// 스티커 서랍(2026-11-01 — 인스타 스토리 스티커처럼 탭으로 나눈 판). 지도에 붙이는 것들이라 지도 위에서 잘 읽히는 것만.
// 스티커 하나 = 문자열 하나: 이모지는 그대로, 글자 스티커는 't:' + 글자. 저장은 map_objects.payload 의 emoji 또는 text.

export type StickerTabKey = 'recent' | 'mood' | 'food' | 'place' | 'mark' | 'word';

export const STICKER_TABS: { key: StickerTabKey; label: string; items: string[] }[] = [
  { key: 'recent', label: '최근', items: [] },
  {
    key: 'mood',
    label: '기분',
    items: ['❤️', '🥰', '😍', '😋', '🤤', '🥹', '😆', '😴', '🤔', '👍', '✨', '🔥'],
  },
  {
    key: 'food',
    label: '먹고 마시기',
    items: ['☕', '🍜', '🍣', '🍕', '🍔', '🥐', '🍰', '🍦', '🍙', '🥘', '🍺', '🍷'],
  },
  {
    key: 'place',
    label: '장소',
    items: ['🌳', '🌸', '🌊', '⛰️', '🏖️', '⛺', '🎡', '🏛️', '🛍️', '🎬', '📚', '🚇'],
  },
  {
    key: 'mark',
    label: '표시',
    items: ['⭐', '📸', '🎁', '🎂', '💐', '🎵', '🚩', '❗', '❓', '💤', '🅿️', '🚻'],
  },
  {
    key: 'word',
    label: '글자',
    items: [
      't:여기!',
      't:맛집',
      't:또 오자',
      't:다음에 가자',
      't:사진 명소',
      't:줄 서는 곳',
      't:비 오면 여기',
      't:첫 만남',
    ],
  },
];

export const DEFAULT_STICKER = '❤️';
export const STICKER_TEXT_MAX = 12;
export const RECENT_STICKERS_MAX = 12;

export function isTextSticker(s: string): boolean {
  return s.startsWith('t:');
}

export function stickerText(s: string): string {
  return isTextSticker(s) ? s.slice(2) : s;
}

// 스티커 → 저장할 payload(이모지 또는 글자)
export function stickerPayload(s: string): { emoji: string } | { text: string } {
  return isTextSticker(s) ? { text: s.slice(2) } : { emoji: s };
}
