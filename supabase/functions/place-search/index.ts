// place-search — 네이버 지역 검색 프록시 (Supabase Edge Function / Deno)
// Secret 은 Supabase Secrets 에 저장한다: NAVER_CLIENT_ID, NAVER_CLIENT_SECRET
// 요청: POST { query: string }
// 응답: { results: { name, address, latitude, longitude, provider, providerPlaceId }[] }

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// 네이버 title 의 <b> 태그 및 HTML 엔티티 제거
function stripTags(input: string): string {
  return input
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

interface NaverLocalItem {
  title?: string;
  address?: string;
  roadAddress?: string;
  mapx?: string;
  mapy?: string;
  link?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { query } = await req.json().catch(() => ({ query: '' }));
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return json({ error: 'query is required' }, 400);
    }

    const clientId = Deno.env.get('NAVER_CLIENT_ID');
    const clientSecret = Deno.env.get('NAVER_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      return json({ error: 'server not configured' }, 500);
    }

    const url =
      'https://openapi.naver.com/v1/search/local.json' +
      `?query=${encodeURIComponent(query)}&display=5&sort=random`;

    const res = await fetch(url, {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    });

    if (!res.ok) {
      const detail = await res.text();
      return json({ error: 'naver search failed', detail }, 502);
    }

    const data = await res.json();
    const items: NaverLocalItem[] = data.items ?? [];

    // mapx=경도, mapy=위도 (10^7 로 나눠 WGS84). 배포 후 알려진 장소로 실측 검증 필요.
    const results = items.map((item) => ({
      name: stripTags(item.title ?? ''),
      address: item.roadAddress || item.address || '',
      latitude: Number(item.mapy) / 1e7,
      longitude: Number(item.mapx) / 1e7,
      provider: 'naver' as const,
      providerPlaceId: item.link || null,
    }));

    return json({ results });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
