// 카카오 검색을 부를 만한 검색어인가 — 쿼터를 아끼려고 글자를 치는 도중엔 부르지 않는다.
// 두 글자 미만이거나, 끝 글자가 조합 중인 한글 낱자("성수 ㅎ", "카페ㅁ")면 아직 아니다.
const TRAILING_JAMO = /[ㄱ-ㆎ]$/;

export function isSearchable(text: string): boolean {
  const t = text.trim();
  return t.length >= 2 && !TRAILING_JAMO.test(t);
}
