import type {
  LivePlace,
  LiveResolveResponse,
  PlaceMatchResponse,
  PlaceSearchResult,
} from '../types/models';
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

// 실시간 핀 1개를 다시 찾는 열쇠 — near 는 핀에 저장된 동네 중심(우리 데이터, 카카오 검색 반경을 좁혀 호출을 줄인다)
export interface LiveItem {
  id: string;
  query: string;
  near: { lat: number; lng: number } | null;
}

// 실시간 핀들의 지금 좌표·이름을 카카오에서 다시 불러온다(저장 없이 표시만 — 데브톡 151294).
export async function resolveLivePlaces(items: LiveItem[]): Promise<LiveResolveResponse> {
  const data = await invokePlaceSearch<LiveResolveResponse>({ action: 'resolve', items });
  return { places: data?.places ?? {}, missing: data?.missing ?? [], failed: data?.failed ?? [] };
}

// 핀 하나씩 물어도 네트워크는 한 번에: 짧게 모아(30ms) 최대 50개씩 resolve 한 번으로 보낸다.
// 결과: 지금 모습 · null(카카오에서 더는 안 나옴) · 실패는 reject(다음에 다시)
const LIVE_BATCH_MS = 30;
const LIVE_BATCH_MAX = 50;
interface LiveWaiter {
  item: LiveItem;
  resolve: (place: LivePlace | null) => void;
  reject: (e: unknown) => void;
}
let liveWaiting: LiveWaiter[] = [];
let liveTimer: ReturnType<typeof setTimeout> | null = null;

async function flushLive() {
  const batch = liveWaiting.slice(0, LIVE_BATCH_MAX);
  liveWaiting = liveWaiting.slice(LIVE_BATCH_MAX);
  liveTimer = liveWaiting.length ? setTimeout(flushLive, LIVE_BATCH_MS) : null;
  try {
    const res = await resolveLivePlaces(batch.map((w) => w.item));
    for (const w of batch) {
      const place = res.places[w.item.id];
      if (place) w.resolve(place);
      else if (res.missing.includes(w.item.id)) w.resolve(null);
      else w.reject(new Error('live resolve failed'));
    }
  } catch (e) {
    for (const w of batch) w.reject(e);
  }
}

export function resolveLivePlace(item: LiveItem): Promise<LivePlace | null> {
  return new Promise((resolve, reject) => {
    liveWaiting.push({ item, resolve, reject });
    if (!liveTimer) liveTimer = setTimeout(flushLive, LIVE_BATCH_MS);
  });
}
