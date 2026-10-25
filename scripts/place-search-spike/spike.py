"""ADR-016 스파이크: 상가(상권)정보(서울) 자체 검색 시제품 vs 현재 배포된 place-search(카카오) 비교.

사용법(데이터는 레포 밖에 두고 경로만 넘긴다):
  python -I spike.py --csv <서울 CSV> --queries queries.json --env ../../.env --out <결과 폴더>

- 표준 라이브러리만 쓴다.
- 랭킹은 운영(Postgres pg_trgm)으로 옮기기 쉬운 규칙만 쓴다: 토큰별 부분 문자열 일치 + 필드 가중치.
- v1 = 데이터 필드만, v2 = v1 + 동네 별칭표(홍대→서교동 등 — 제품에 넣을 수 있는 일반 통칭만).
- 카카오 결과는 비교 판정에만 쓰고 결과 파일에는 이름 일치 여부만 남긴다(ADR-016: 결과 저장 금지).
"""

import argparse
import csv
import json
import math
import re
import statistics
import sys
import time
import unicodedata
import urllib.request
from pathlib import Path

# 상가(상권)정보 CSV 헤더 → 내부 필드
COLUMNS = {
    "name": "상호명",
    "branch": "지점명",
    "cat1": "상권업종대분류명",
    "cat2": "상권업종중분류명",
    "cat3": "상권업종소분류명",
    "gu": "시군구명",
    "hdong": "행정동명",
    "bdong": "법정동명",
    "road": "도로명",
    "bldg": "건물명",
    "lng": "경도",
    "lat": "위도",
}

# 데이터에 없는 동네 통칭 → 법정동·도로·건물 키워드(v2 전용).
ALIASES = {
    "홍대": ["서교동", "동교동", "홍익"],
    "광화문": ["세종로", "종로1가", "신문로"],
    "코엑스": ["삼성동", "코엑스"],
    "안국": ["안국동", "계동", "소격동", "재동", "가회동"],
    "광장시장": ["예지동", "광장시장", "종로5가", "종로4가"],
    "가로수길": ["신사동", "가로수길"],
    "을지로": ["을지로", "입정동", "주교동", "산림동", "초동"],
    "성수": ["성수동"],
    "한남": ["한남동"],
    "강남": ["강남구", "역삼동"],
    "여의도": ["여의도동"],
}

TOP_K = 5


def norm(s):
    return re.sub(r"\s+", "", unicodedata.normalize("NFKC", s or "").lower())


def open_csv(path):
    for enc in ("utf-8-sig", "cp949"):
        try:
            f = open(path, encoding=enc, newline="")
            f.readline()
            f.seek(0)
            return f, enc
        except UnicodeDecodeError:
            f.close()
    raise RuntimeError("CSV 인코딩을 판별하지 못했습니다")


def load(path):
    f, enc = open_csv(path)
    with f:
        reader = csv.DictReader(f)
        missing = [c for c in COLUMNS.values() if c not in reader.fieldnames]
        if missing:
            raise RuntimeError(f"CSV 에 없는 열: {missing} (헤더: {reader.fieldnames})")
        rows = []
        for r in reader:
            g = {k: (r.get(c) or "").strip() for k, c in COLUMNS.items()}
            g["n_name"] = norm(g["name"] + g["branch"])
            g["n_cat"] = norm(g["cat1"] + g["cat2"] + g["cat3"])
            g["n_area"] = norm(g["bdong"] + g["hdong"] + g["road"] + g["bldg"] + g["gu"])
            rows.append(g)
    return rows, enc


def split_compound(t):
    # "한옥카페" → 한옥 + 카페, "와인바" → 와인 (업종명엔 "와인바" 같은 세부 분류가 없다)
    if t.endswith("카페") and len(t) > 2:
        return [t[:-2], "카페"]
    if t.endswith("바") and len(t) > 2:
        return [t[:-1]]
    return [t]


def search(rows, query, use_alias, smart=False):
    tokens = query.split()
    if smart:
        tokens = [p for t in tokens for p in split_compound(t)]
    plan = []
    for t in tokens:
        alias = [norm(a) for a in ALIASES.get(t, [])] if use_alias else []
        plan.append((norm(t), alias))

    # smart: 흔한 단어(청담·합정)보다 드문 단어(노티드)에 무게 — Postgres 에선 단어 빈도 테이블로 대체 가능.
    weights = [1.0] * len(plan)
    if smart:
        n = len(rows)
        for i, (t, alias) in enumerate(plan):
            df = sum(
                1
                for r in rows
                if t in r["n_name"] or t in r["n_cat"] or t in r["n_area"] or any(a in r["n_area"] for a in alias)
            )
            weights[i] = math.log((n + 1) / (df + 1))

    def score(r):
        matched, s = 0, 0.0
        for (t, alias), w in zip(plan, weights):
            if t in r["n_name"]:
                hit = 3.0
            elif t in r["n_cat"]:
                hit = 2.0
            elif t in r["n_area"] or any(a in r["n_area"] for a in alias):
                hit = 1.5
            else:
                hit = 0.0
            if hit:
                matched += 1
                s += hit * w
        return matched, s

    scored = []
    for r in rows:
        m, s = score(r)
        if m:
            scored.append((m, s, r))
    # 모든 토큰이 맞는 결과를 우선, 없으면 하나 덜 맞는 결과로 완화(AND → n-1).
    need = len(plan)
    strict = [x for x in scored if x[0] >= need]
    pool = strict or [x for x in scored if x[0] >= max(1, need - 1)]
    pool.sort(key=lambda x: (-x[1], len(x[2]["n_name"])))
    return [x[2] for x in pool[:TOP_K]]


def judge_named(results, q, name_of, gu_of):
    kws = [norm(k) for k in q["name"]]
    for i, r in enumerate(results):
        if any(k in norm(name_of(r)) for k in kws) and q["gu"] in gu_of(r):
            return i + 1
    return None


def judge_landmark_kakao(results, q):
    # 랜드마크 자체(공원·타워)인지: 이름이 키워드로 시작해야 한다(주변 가게 "스타벅스 뚝섬한강공원" 제외).
    kws = [norm(k) for k in q["name"]]
    for i, r in enumerate(results):
        if any(norm(r.get("name", "")).startswith(k) for k in kws) and q["gu"] in r.get("address", ""):
            return i + 1
    return None


def judge_category(results, q, text_of, gu_of):
    kws = [norm(k) for k in q["category"]]
    return sum(1 for r in results if any(k in norm(text_of(r)) for k in kws) and q["gu"] in gu_of(r))


def exists_in_data(rows, q):
    kws = [norm(k) for k in q["name"]]
    return any(any(k in r["n_name"] for k in kws) and r["gu"] == q["gu"] for r in rows)


def read_env(path):
    env = {}
    for line in Path(path).read_text(encoding="utf-8").splitlines():
        m = re.match(r"^([A-Z0-9_]+)=(.*)$", line.strip())
        if m:
            env[m.group(1)] = m.group(2)
    return env


def kakao_search(env, query):
    url = env["EXPO_PUBLIC_SUPABASE_URL"].rstrip("/") + "/functions/v1/place-search"
    key = env["EXPO_PUBLIC_SUPABASE_ANON_KEY"]
    req = urllib.request.Request(
        url,
        data=json.dumps({"query": query}, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {key}", "apikey": key},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=20) as res:
        return (json.loads(res.read().decode("utf-8")).get("results") or [])[:TOP_K]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", required=True)
    ap.add_argument("--queries", required=True)
    ap.add_argument("--env")
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")  # -I 는 PYTHONIOENCODING 을 무시한다

    t0 = time.perf_counter()
    rows, enc = load(args.csv)
    load_s = time.perf_counter() - t0
    queries = json.loads(Path(args.queries).read_text(encoding="utf-8"))["queries"]
    env = read_env(args.env) if args.env else None

    versions = (("v1", False, False), ("v2", True, False), ("v3", True, True))
    report, lat = [], {v[0]: [] for v in versions}
    for q in queries:
        entry = {"q": q["q"], "kind": q["kind"]}
        for ver, alias, smart in versions:
            t = time.perf_counter()
            res = search(rows, q["q"], alias, smart)
            lat[ver].append((time.perf_counter() - t) * 1000)
            if q["kind"] == "category":
                entry[ver] = judge_category(res, q, lambda r: r["n_cat"] + r["n_name"], lambda r: r["gu"])
            elif q["kind"] == "landmark":
                # 상가(상권)정보는 상가업소만 담는다 → 공원·타워 같은 장소 자체는 없고 이름에 붙은 주변 가게만 나온다.
                entry[ver] = None
            else:
                entry[ver] = judge_named(res, q, lambda r: r["name"] + r["branch"], lambda r: r["gu"])
            entry[ver + "_top"] = [f'{r["name"]} {r["branch"]}'.strip() + f' ({r["gu"]} {r["bdong"]} / {r["cat3"]})' for r in res]
        if q["kind"] != "category":
            entry["in_data"] = exists_in_data(rows, q)
        if env:
            try:
                kres = kakao_search(env, q["q"])
                if q["kind"] == "category":
                    # 배포 함수 응답엔 업종이 없어 지역 일치 건수로만 본다(카테고리는 카카오 검색 자체를 신뢰).
                    entry["kakao"] = sum(1 for r in kres if q["gu"] in r.get("address", ""))
                elif q["kind"] == "landmark":
                    entry["kakao"] = judge_landmark_kakao(kres, q)
                else:
                    entry["kakao"] = judge_named(kres, q, lambda r: r.get("name", ""), lambda r: r.get("address", ""))
                entry["kakao_n"] = len(kres)
            except Exception as e:  # noqa: BLE001 — 비교 기준 실패는 기록만
                entry["kakao_error"] = str(e)
        report.append(entry)

    def ok(e, ver):
        v = e.get(ver)
        return (v or 0) >= 3 if e["kind"] == "category" else v is not None

    summary = {"rows": len(rows), "encoding": enc, "load_s": round(load_s, 1)}
    for ver in [v[0] for v in versions] + ["kakao"]:
        for kind in ("named", "landmark", "category"):
            sub = [e for e in report if e["kind"] == kind and ver in e]
            if sub:
                summary[f"{ver}_{kind}"] = f"{sum(ok(e, ver) for e in sub)}/{len(sub)}"
        allq = [e for e in report if ver in e]
        if allq:
            summary[f"{ver}_all"] = f"{sum(ok(e, ver) for e in allq)}/{len(allq)}"
    # 시제품은 인덱스 없는 파이썬 선형 탐색이라 운영(Postgres pg_trgm) 지연과 무관한 참고값이다.
    for ver in [v[0] for v in versions]:
        summary[f"{ver}_ms_p50"] = round(statistics.median(lat[ver]), 1)
        summary[f"{ver}_ms_p95"] = round(sorted(lat[ver])[int(len(lat[ver]) * 0.95) - 1], 1)
    named = [e for e in report if e["kind"] == "named"]
    summary["named_in_data"] = f"{sum(e['in_data'] for e in named)}/{len(named)}"

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    (out / "spike_results.json").write_text(
        json.dumps({"summary": summary, "queries": report}, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
