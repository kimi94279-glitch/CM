"""ADR-016 파일럿: 웹 리서치 시드(pilot_seed.json)를 상가(상권)정보와 매칭해 커버리지를 잰다.

사용법:
  python -I pilot_match.py --csv <서울 CSV> --seed pilot_seed.json --out <결과 폴더>

판정:
- strict = 상호(상호명+지점명)에 매칭 키워드 포함 + 법정동이 해당 동네 목록 안
- loose  = 상호에 키워드 포함 + 시군구만 일치(동네 경계·주소 이전 허용)
- 두 글자 이하 키워드("하하", "귀")는 상호가 키워드와 같거나 키워드로 시작할 때만 인정(오매칭 방지).
"""

import argparse
import collections
import csv
import json
import re
import sys
import unicodedata
from pathlib import Path


def norm(s):
    return re.sub(r"\s+", "", unicodedata.normalize("NFKC", s or "").lower())


def name_hit(n_name, kws):
    for k in kws:
        if len(k) <= 2:
            if n_name == k or n_name.startswith(k):
                return True
        elif k in n_name:
            return True
    return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", required=True)
    ap.add_argument("--seed", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")

    seed = json.loads(Path(args.seed).read_text(encoding="utf-8"))
    areas = seed["areas"]
    places = seed["places"]
    by_gu = collections.defaultdict(list)
    with open(args.csv, encoding="utf-8-sig", newline="") as f:
        for r in csv.DictReader(f):
            by_gu[r["시군구명"]].append(
                (norm(r["상호명"] + r["지점명"]), r["법정동명"], f'{r["상호명"]} {r["지점명"]}'.strip(), r["상권업종소분류명"])
            )

    results = []
    for p in places:
        a = areas[p["area"]]
        kws = [norm(k) for k in p["match"]]
        strict, loose = [], []
        for n_name, bdong, label, cat in by_gu[a["gu"]]:
            if not name_hit(n_name, kws):
                continue
            hit = f"{label} ({bdong} / {cat})"
            loose.append(hit)
            if bdong in a["dong"]:
                strict.append(hit)
        results.append({**p, "strict": len(strict), "loose": len(loose), "examples": (strict or loose)[:3]})

    def rate(rows, key):
        return f"{sum(1 for r in rows if r[key])}/{len(rows)}"

    summary = {"total": rate(results, "strict") + " strict, " + rate(results, "loose") + " loose"}
    for kind in ("shop", "venue", "landmark"):
        sub = [r for r in results if r["kind"] == kind]
        summary[kind] = f"strict {rate(sub, 'strict')} / loose {rate(sub, 'loose')}"
    for area in areas:
        sub = [r for r in results if r["area"] == area and r["kind"] == "shop"]
        if sub:
            summary[f"shop_{area}"] = f"strict {rate(sub, 'strict')} / loose {rate(sub, 'loose')}"
    summary["missing"] = [f'{r["name"]} [{r["kind"]}/{r["type"]}]' for r in results if not r["loose"]]
    summary["loose_only"] = [f'{r["name"]} → {r["examples"][0]}' for r in results if r["loose"] and not r["strict"]]

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    (out / "pilot_results.json").write_text(
        json.dumps({"summary": summary, "places": results}, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
