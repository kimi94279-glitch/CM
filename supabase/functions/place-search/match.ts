// 카카오 결과 1건 ↔ 공공데이터(poi) 후보 매칭 — 순수 함수(Deno·Node 공용, 외부 import 없음).
// 설계: docs/Place Matching.md §3. 카카오 값은 조회 키로만 쓰고 여기서 저장하지 않는다.

export interface PoiCandidate {
  id: string;
  name: string;
  branch: string | null;
  category: string | null;
  address: string | null;
  lat: number;
  lng: number;
}

export interface MatchResult {
  candidate: PoiCandidate;
  confidence: 'high' | 'low';
  distanceM: number;
}

const MAX_DISTANCE_M = 150;
const HIGH_DISTANCE_M = 120;
const WEAK_DISTANCE_M = 80;
const WEAK_SIMILARITY = 0.5;

export function normalizeName(s: string): string {
  return s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^0-9a-z가-힣]/g, '');
}

export function distanceM(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = Math.PI / 180;
  const dLat = (bLat - aLat) * toRad;
  const dLng = (bLng - aLng) * toRad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * toRad) * Math.cos(bLat * toRad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

function bigrams(s: string): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) out.add(s.slice(i, i + 2));
  return out;
}

function jaccard(a: string, b: string): number {
  const A = bigrams(a);
  const B = bigrams(b);
  if (A.size === 0 || B.size === 0) return a === b && a.length > 0 ? 1 : 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}

// 동네 이름처럼 보이는 토큰("연남동", "성수역", "종로3가", "을지로") — 혼자서는 가게 이름 비교에 쓰지 않는다.
const AREA_TOKEN = /^[가-힣]{1,4}(동|로|길|역|[0-9]+가)$/;

// 카카오 이름에서 비교용 변형을 만든다: 전체 / 지점 꼬리를 뗀 전체 / 첫 토큰 / 마지막 토큰(지점·동네 이름일 때가 많다)을 뺀 나머지.
// "어니언 성수" → [어니언성수, 어니언] · "스타벅스 성수역점" → [스타벅스성수역점, 스타벅스]
// rest = 그 변형에서 빠진 부분. 빠진 게 짧은 동네·지점 이름이 아니면 "부분 일치"로 보고 확인을 받는다
// ("무신사 뷰티 스페이스" 의 "무신사" 만 맞은 "무신사 스탠다드" 는 다른 가게일 수 있다).
interface Variant {
  v: string;
  rest: string;
}

function kakaoVariants(name: string): Variant[] {
  const tokens = name.normalize('NFKC').split(/\s+/).map(normalizeName).filter(Boolean);
  const full = tokens.join('');
  const out: Variant[] = [{ v: full, rest: '' }];
  const noBranch = full.replace(/(본점|직영점|[0-9a-z가-힣]{1,8}점)$/, '');
  if (noBranch !== full && noBranch.length >= 2) out.push({ v: noBranch, rest: '' });
  if (tokens.length >= 2) {
    const head = tokens.slice(0, -1).join('');
    if (!AREA_TOKEN.test(head)) out.push({ v: head, rest: tokens[tokens.length - 1] });
    if (tokens.length >= 3 && !AREA_TOKEN.test(tokens[0]))
      out.push({ v: tokens[0], rest: tokens.slice(1).join('') });
  }
  return out.filter((x) => x.v);
}

function restIsLabel(rest: string, pFull: string): boolean {
  return (
    !rest || pFull.includes(rest) || rest.length <= 3 || AREA_TOKEN.test(rest) || /점$/.test(rest)
  );
}

type Strength = 'exact' | 'strong' | 'partial' | 'weak' | 'none';

function nameStrength(
  kakaoName: string,
  c: PoiCandidate
): { strength: Strength; similarity: number } {
  const kFull = normalizeName(kakaoName);
  const pBase = normalizeName(c.name);
  const pFull = normalizeName(c.name + (c.branch ?? ''));
  if (!kFull || !pBase) return { strength: 'none', similarity: 0 };
  if (pBase === kFull || pFull === kFull) return { strength: 'exact', similarity: 1 };
  // 공공 상호가 카카오 이름 안에 통째로 들어 있으면("탐앤탐스" ⊂ "탐앤탐스성수") 강한 일치
  if (pBase.length >= 3 && kFull.includes(pBase)) return { strength: 'strong', similarity: 1 };
  let partial = false;
  for (const { v, rest } of kakaoVariants(kakaoName)) {
    // 두 글자 이하는 완전히 같을 때만("하하" ≠ "하하하우스", "귀" ≠ "귀빈")
    const hit = v.length <= 2 || pBase.length <= 2 ? v === pBase : pFull.includes(v);
    if (!hit) continue;
    if (restIsLabel(rest, pFull)) return { strength: 'strong', similarity: 1 };
    partial = true;
  }
  if (partial) return { strength: 'partial', similarity: 0.8 };
  const similarity = Math.max(jaccard(kFull, pFull), jaccard(kFull, pBase));
  return { strength: similarity >= WEAK_SIMILARITY ? 'weak' : 'none', similarity };
}

// 카카오 결과(이름·좌표)에 맞는 poi 후보 하나를 고른다. 없으면 null.
export function pickMatch(
  kakao: { name: string; latitude: number; longitude: number },
  candidates: PoiCandidate[]
): MatchResult | null {
  const scored = candidates
    .map((c) => {
      const d = distanceM(kakao.latitude, kakao.longitude, c.lat, c.lng);
      const { strength, similarity } = nameStrength(kakao.name, c);
      const rank =
        strength === 'exact'
          ? 3
          : strength === 'strong'
            ? 2
            : strength === 'partial' || strength === 'weak'
              ? 1
              : 0;
      return { c, d, strength, similarity, rank };
    })
    .filter((x) =>
      x.strength === 'exact' || x.strength === 'strong' || x.strength === 'partial'
        ? x.d <= MAX_DISTANCE_M
        : x.strength === 'weak' && x.d <= WEAK_DISTANCE_M
    )
    .sort((a, b) => b.rank - a.rank || b.similarity - a.similarity || a.d - b.d);

  const best = scored[0];
  if (!best) return null;

  // 다른 가게가 같은 급으로 비슷한 거리에 있으면(같은 이름의 다른 가게·층별 매장) 확인을 받는다.
  const rival = scored.find(
    (x) =>
      x !== best &&
      x.rank === best.rank &&
      normalizeName(x.c.name) !== normalizeName(best.c.name) &&
      x.d - best.d < 30
  );
  const high = best.rank >= 2 && best.d <= HIGH_DISTANCE_M && !rival;
  return { candidate: best.c, confidence: high ? 'high' : 'low', distanceM: Math.round(best.d) };
}

// 카카오 지번 주소("서울 성동구 성수동2가 277-135")에서 시군구·법정동을 뗀다. 조회 키로만 쓴다.
export function parseDong(
  jibunAddress: string | null | undefined
): { sigungu: string; bdong: string } | null {
  const t = (jibunAddress ?? '').trim().split(/\s+/);
  if (t.length < 3) return null;
  const [, sigungu, bdong] = t;
  if (!/(구|시|군)$/.test(sigungu) || !/(동|가|로|리)$/.test(bdong.replace(/[0-9]+가$/, '가')))
    return null;
  return { sigungu, bdong };
}
