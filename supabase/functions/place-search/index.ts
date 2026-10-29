// place-search — 카카오 로컬(키워드) 검색 프록시 + 공공데이터(poi) 매칭 (Supabase Edge Function / Deno)
// ADR-016 Option D′ · docs/Place Matching.md — 카카오는 찾기(표시)와 매칭 조회 키로만 쓴다.
// 카카오 응답은 이 요청 안에서만 쓴다: 저장·로그·캐시 없음(Cache-Control: no-store).
// Secret: KAKAO_REST_API_KEY. DB 는 함수 기본 env(SUPABASE_URL·SUPABASE_SERVICE_ROLE_KEY)로 poi_lookup 만 부른다.
//
// 요청 1 — 찾기:  POST { action?: 'search', query: string }
//   응답: { results: { name, address, jibunAddress, latitude, longitude, provider: 'kakao', providerPlaceId }[] }  (화면 표시 전용)
// 요청 2 — 매칭:  POST { action: 'match', name, latitude, longitude, jibunAddress? }  (사용자가 고른 결과 1건)
//   응답: { match: { poiId, name, branch, category, address, latitude, longitude, confidence } | null,
//           dong: { name, latitude, longitude } | null }   // dong = 우리 데이터의 동네 중심(실시간 핀의 자리표시 좌표)
// 요청 3 — 실시간 핀 표시:  POST { action: 'resolve', items: { id: 카카오 장소 ID, query: 사용자가 친 검색어 }[] } (최대 50)
//   응답: { places: { [id]: { name, address, latitude, longitude } }, missing: string[], failed: string[] }
//   그 검색어로 카카오를 다시 찾아 같은 ID 의 지금 좌표·이름을 돌려준다 — 화면 표시 전용, 저장하지 않는다(데브톡 151294).
//   missing = 카카오에서 더는 안 나옴(폐업·이전 등), failed = 카카오 오류(다음에 다시).

import { parseDong, pickMatch, type PoiCandidate } from './match.ts';

const KAKAO_KEYWORD = 'https://dapi.kakao.com/v2/local/search/keyword.json';
const RESOLVE_MAX_ITEMS = 50;
const RESOLVE_MAX_PAGES = 3; // 카카오 키워드 검색은 15건 × 3쪽(45건)까지
const RESOLVE_CONCURRENCY = 5;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

interface KakaoLocalDocument {
  id?: string;
  place_name?: string;
  address_name?: string;
  road_address_name?: string;
  x?: string; // 경도(longitude), WGS84
  y?: string; // 위도(latitude), WGS84
}

interface LookupResponse {
  candidates?: PoiCandidate[];
  dong?: { name: string; lat: number; lng: number } | null;
}

async function search(query: unknown): Promise<Response> {
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return json({ error: 'query is required' }, 400);
  }

  const restApiKey = Deno.env.get('KAKAO_REST_API_KEY');
  if (!restApiKey) {
    return json({ error: 'server not configured' }, 500);
  }

  const url = `${KAKAO_KEYWORD}?query=${encodeURIComponent(query)}&size=15`;

  const res = await fetch(url, {
    headers: { Authorization: `KakaoAK ${restApiKey}` },
  });

  if (!res.ok) {
    return json({ error: 'kakao search failed', status: res.status }, 502);
  }

  const data = await res.json();
  const documents: KakaoLocalDocument[] = data.documents ?? [];

  // 카카오 x/y 는 WGS84 경도/위도 (변환 불필요)
  const results = documents.map((doc) => ({
    name: doc.place_name ?? '',
    address: doc.road_address_name || doc.address_name || '',
    jibunAddress: doc.address_name ?? '',
    latitude: Number(doc.y),
    longitude: Number(doc.x),
    provider: 'kakao' as const,
    providerPlaceId: doc.id ?? null,
  }));

  return json({ results });
}

async function match(body: Record<string, unknown>): Promise<Response> {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  if (!name || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return json({ error: 'name, latitude, longitude are required' }, 400);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return json({ error: 'server not configured' }, 500);
  }

  const dong = parseDong(typeof body.jibunAddress === 'string' ? body.jibunAddress : null);
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/poi_lookup`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_lat: latitude,
      p_lng: longitude,
      p_sigungu: dong?.sigungu ?? null,
      p_bdong: dong?.bdong ?? null,
    }),
  });
  if (!res.ok) {
    return json({ error: 'lookup failed', status: res.status }, 502);
  }

  const lookup = (await res.json()) as LookupResponse;
  const picked = pickMatch({ name, latitude, longitude }, lookup.candidates ?? []);
  const d = lookup.dong;
  const dongOut = d ? { name: d.name, latitude: d.lat, longitude: d.lng } : null;
  if (picked) {
    const c = picked.candidate;
    return json({
      match: {
        poiId: c.id,
        name: c.name,
        branch: c.branch,
        category: c.category,
        address: c.address,
        latitude: c.lat,
        longitude: c.lng,
        confidence: picked.confidence,
      },
      dong: dongOut,
    });
  }
  return json({ match: null, dong: dongOut });
}

interface ResolveItem {
  id: string;
  query: string;
}

async function resolve(body: Record<string, unknown>): Promise<Response> {
  const restApiKey = Deno.env.get('KAKAO_REST_API_KEY');
  if (!restApiKey) {
    return json({ error: 'server not configured' }, 500);
  }

  const seen = new Set<string>();
  const items: ResolveItem[] = [];
  for (const raw of Array.isArray(body.items) ? body.items : []) {
    const id = (raw as ResolveItem)?.id;
    const query = (raw as ResolveItem)?.query;
    if (typeof id !== 'string' || !/^[0-9]{1,20}$/.test(id)) continue;
    if (typeof query !== 'string' || !query.trim() || query.length > 100) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    items.push({ id, query: query.trim() });
    if (items.length >= RESOLVE_MAX_ITEMS) break;
  }

  const places: Record<
    string,
    { name: string; address: string; latitude: number; longitude: number }
  > = {};
  const missing: string[] = [];
  const failed: string[] = [];

  const one = async ({ id, query }: ResolveItem) => {
    for (let page = 1; page <= RESOLVE_MAX_PAGES; page++) {
      const res = await fetch(
        `${KAKAO_KEYWORD}?query=${encodeURIComponent(query)}&size=15&page=${page}`,
        {
          headers: { Authorization: `KakaoAK ${restApiKey}` },
        }
      );
      if (!res.ok) {
        failed.push(id);
        return;
      }
      const data = await res.json();
      const documents: KakaoLocalDocument[] = data.documents ?? [];
      const doc = documents.find((x) => x.id === id);
      if (doc) {
        places[id] = {
          name: doc.place_name ?? '',
          address: doc.road_address_name || doc.address_name || '',
          latitude: Number(doc.y),
          longitude: Number(doc.x),
        };
        return;
      }
      if (data.meta?.is_end) break;
    }
    missing.push(id);
  };

  // 동시에 몇 개씩만(카카오 쿼터·속도 보호)
  for (let i = 0; i < items.length; i += RESOLVE_CONCURRENCY) {
    await Promise.all(
      items
        .slice(i, i + RESOLVE_CONCURRENCY)
        .map((it) => one(it).catch(() => void failed.push(it.id)))
    );
  }

  return json({ places, missing, failed });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    if (body.action === 'match') return await match(body);
    if (body.action === 'resolve') return await resolve(body);
    return await search(body.query);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
