import type { PlaceSearchResult } from '../types/models';
import { supabase } from './supabase';

// [DEBUG] 진단용: 마지막 검색 호출의 원본 정보를 보관 (UI 표시용)
export interface SearchDebugInfo {
  status?: number;
  rawData?: unknown;
  errorName?: string;
  errorMessage?: string;
  contextBody?: string;
}
export let lastSearchDebug: SearchDebugInfo = {};

// place-search Edge Function 호출 (네이버 지역 검색 프록시)
export async function searchPlaces(query: string): Promise<PlaceSearchResult[]> {
  const debug: SearchDebugInfo = {};
  const { data, error } = await supabase.functions.invoke('place-search', {
    body: { query },
  });

  if (error) {
    debug.errorName = error.name;
    debug.errorMessage = error.message;
    // FunctionsHttpError 의 실제 응답 본문/상태는 error.context 에 들어있다.
    const ctx = (error as { context?: Response }).context;
    if (ctx) {
      debug.status = ctx.status;
      try {
        debug.contextBody = await ctx.clone().text();
      } catch {
        debug.contextBody = '(context body 읽기 실패)';
      }
    }
    lastSearchDebug = debug;
    // 진단을 위해 context 본문을 메시지에 포함시켜 던진다.
    throw new Error(
      `invoke error: ${error.message}` +
        (debug.status ? ` [status ${debug.status}]` : '') +
        (debug.contextBody ? ` body=${debug.contextBody.slice(0, 300)}` : '')
    );
  }

  debug.rawData = data;
  lastSearchDebug = debug;
  return (data?.results ?? []) as PlaceSearchResult[];
}
