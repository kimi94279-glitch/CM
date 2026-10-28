// Place Matching §9 검증: 파일럿 시드 → 배포된 place-search(카카오)로 찾기 → 사용자가 고를 결과 1건 → poi 매칭.
// 카카오 결과(이름·좌표)는 메모리에서만 쓰고 파일에 남기지 않는다. 출력 = 판정 + 우리 poi 이름뿐.
// 사용: node verify_match.mjs <repo> <poi csv> <out json>
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const [repo, poiCsv, outPath] = process.argv.slice(2);
const { pickMatch, normalizeName, distanceM } = await import(
  pathToFileURL(`${repo}/supabase/functions/place-search/match.ts`).href
);

// --- env (값은 출력하지 않는다)
const env = Object.fromEntries(
  readFileSync(`${repo}/.env`, 'utf8')
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()])
);
const fnUrl = env.EXPO_PUBLIC_SUPABASE_URL.replace(/\/$/, '') + '/functions/v1/place-search';
const key = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// --- poi CSV → 격자 색인
function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else q = false;
      } else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
}
const CELL = 0.002;
const grid = new Map();
const lines = readFileSync(poiCsv, 'utf8').split(/\r?\n/);
const head = parseCsvLine(lines[0]);
const ix = Object.fromEntries(head.map((h, i) => [h, i]));
let nPoi = 0;
for (let i = 1; i < lines.length; i++) {
  if (!lines[i]) continue;
  const f = parseCsvLine(lines[i]);
  const p = {
    id: f[ix.id],
    name: f[ix.name],
    branch: f[ix.branch] || null,
    category: f[ix.category] || null,
    address: f[ix.road_address] || null,
    lat: +f[ix.lat],
    lng: +f[ix.lng],
    sigungu: f[ix.sigungu],
    bdong: f[ix.bdong],
  };
  const k = `${Math.floor(p.lat / CELL)}:${Math.floor(p.lng / CELL)}`;
  (grid.get(k) ?? grid.set(k, []).get(k)).push(p);
  nPoi++;
}
// poi_lookup 흉내: 150m 상자 안, 가까운 순 60개
function near(lat, lng, r = 150) {
  const dLat = r / 110540,
    dLng = r / (111320 * Math.cos((lat * Math.PI) / 180));
  const out = [];
  for (let a = Math.floor((lat - dLat) / CELL); a <= Math.floor((lat + dLat) / CELL); a++)
    for (let b = Math.floor((lng - dLng) / CELL); b <= Math.floor((lng + dLng) / CELL); b++)
      for (const p of grid.get(`${a}:${b}`) ?? [])
        if (Math.abs(p.lat - lat) <= dLat && Math.abs(p.lng - lng) <= dLng) out.push(p);
  return out
    .sort((x, y) => distanceM(lat, lng, x.lat, x.lng) - distanceM(lat, lng, y.lat, y.lng))
    .slice(0, 60);
}

async function kakao(query) {
  const res = await fetch(fnUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, apikey: key },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`place-search ${res.status}`);
  return (await res.json()).results ?? [];
}

const seed = JSON.parse(readFileSync(`${repo}/scripts/place-search-spike/pilot_seed.json`, 'utf8'));
const rows = [];
const shown = new Map(); // 콘솔 판정용(파일에 안 남김)
const t0 = Date.now();
for (const p of seed.places) {
  const area = seed.areas[p.area];
  const kws = p.match.map(normalizeName);
  const hit = (name) => {
    const n = normalizeName(name);
    return kws.some((k) => (k.length <= 2 ? n === k || n.startsWith(k) : n.includes(k)));
  };
  const results = await kakao(`${p.name} ${p.area}`);
  const chosen = results.find((r) => hit(r.name)); // 사용자가 고를 결과
  const row = { name: p.name, kind: p.kind, area: p.area };
  if (!chosen) {
    rows.push({ ...row, verdict: 'kakao_none' });
    continue;
  }
  shown.set(p.name, chosen.name);
  const cands = near(chosen.latitude, chosen.longitude);
  const m = pickMatch(chosen, cands);
  // 공공데이터에 그 가게가 있나(정답 후보): 300m 안 + 키워드 + 같은 구
  const truth = near(chosen.latitude, chosen.longitude, 300).filter(
    (c) => hit(c.name + (c.branch ?? '')) && c.sigungu === area.gu
  );
  if (m) {
    const ok = hit(m.candidate.name + (m.candidate.branch ?? ''));
    rows.push({
      ...row,
      verdict: ok ? 'correct' : 'wrong',
      confidence: m.confidence,
      distanceM: m.distanceM,
      poi: `${m.candidate.name} ${m.candidate.branch ?? ''}`.trim(),
      poiCategory: m.candidate.category,
      inPublic: truth.length > 0,
    });
  } else {
    rows.push({
      ...row,
      verdict: truth.length ? 'missed' : 'not_in_public',
      truthPoi: truth[0] ? `${truth[0].name} ${truth[0].branch ?? ''}`.trim() : null,
      nCandidates: cands.length,
    });
  }
}
const count = (f) => rows.filter(f).length;
const summary = {
  poi: nPoi,
  places: rows.length,
  kakao_none: count((r) => r.verdict === 'kakao_none'),
  correct: count((r) => r.verdict === 'correct'),
  correct_high: count((r) => r.verdict === 'correct' && r.confidence === 'high'),
  wrong: count((r) => r.verdict === 'wrong'),
  wrong_high: count((r) => r.verdict === 'wrong' && r.confidence === 'high'),
  missed: count((r) => r.verdict === 'missed'),
  not_in_public: count((r) => r.verdict === 'not_in_public'),
  ms: Date.now() - t0,
};
writeFileSync(outPath, JSON.stringify({ summary, rows }, null, 2));
console.log(JSON.stringify(summary));
for (const r of rows.filter(
  (r) =>
    (r.verdict === 'correct' || r.verdict === 'wrong') &&
    (r.verdict !== 'correct' || r.confidence === 'low')
))
  console.log(JSON.stringify({ ...r, kakaoShown: shown.get(r.name) }));
for (const r of rows.filter((r) => r.verdict === 'correct' && r.confidence === 'high'))
  console.log('OK', r.name, '|', shown.get(r.name), '→', r.poi, r.distanceM + 'm');
