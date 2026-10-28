import type { PlaceMatchResponse, PlaceSearchResult } from '../types/models';
import { supabase } from './supabase';

// place-search Edge Function 호출 실패를 진단 정보(상태·응답 본문)와 함께 던진다.
async function invokePlaceSearch<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('place-search', { body });

  if (error) {
    // FunctionsHttpError 의 실제 응답 본문/상태는 error.context 에 들어있다.
    const ctx = (error as { context?: Response }).context;
    let status: number | undefined;
    let contextBody: string | undefined;
    if (ctx) {
      status = ctx.status;
      try {
        contextBody = await ctx.clone().text();
      } catch {
        contextBody = '(context body 읽기 실패)';
      }
    }
    throw new Error(
      `invoke error: ${error.message}` +
        (status ? ` [status ${status}]` : '') +
        (contextBody ? ` body=${contextBody.slice(0, 300)}` : '')
    );
  }

  return data as T;
}

// 카카오 로컬 검색(place-search). 결과는 화면 표시 전용이다 — 저장하지 않는다(ADR-016 Option D′).
export async function searchPlaces(query: string): Promise<PlaceSearchResult[]> {
  const data = await invokePlaceSearch<{ results?: PlaceSearchResult[] }>({ query });
  return data?.results ?? [];
}

// 사용자가 고른 결과 1건에 맞는 공공데이터 레코드를 찾는다. 카카오 이름·좌표·주소는 조회 키로만 보내고 버린다.
export async function matchPlace(result: PlaceSearchResult): Promise<PlaceMatchResponse> {
  const data = await invokePlaceSearch<PlaceMatchResponse>({
    action: 'match',
    name: result.name,
    latitude: result.latitude,
    longitude: result.longitude,
    jibunAddress: result.jibunAddress ?? null,
  });
  return { match: data?.match ?? null, dong: data?.dong ?? null };
}
