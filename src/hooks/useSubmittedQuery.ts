import { useEffect, useState } from 'react';

import { isSearchable } from '../utils/searchText';

const DEBOUNCE_MS = 400;

// 입력 중인 검색어 → 400ms 뒤 "제출된" 검색어. 카카오 쿼터 절약: 두 글자 미만·조합 중인 한글("성수 ㅎ")에선
// 제출하지 않고 앞 결과를 그대로 둔다(다 지우면 비움). reset 은 검색을 닫을 때 바로 비우는 용도.
export function useSubmittedQuery(text: string): [string, () => void] {
  const [query, setQuery] = useState('');
  useEffect(() => {
    const id = setTimeout(() => {
      const t = text.trim();
      if (t.length === 0 || isSearchable(t)) setQuery(t);
    }, DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [text]);
  return [query, () => setQuery('')];
}
