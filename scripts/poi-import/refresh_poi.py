"""poi(공공데이터 장소) 적재·갱신 — ADR-016 Option D′, docs/Place Matching.md §2.

공공데이터포털 상가(상권)정보(분기 갱신, 이용허락범위 제한 없음)의 최신 파일을 확인해
우리 poi 보다 새로우면 내려받아 데이트 업종만 골라 Supabase 에 올린다. 처음 적재·분기 갱신 모두 이 스크립트 하나.
GitHub Actions(.github/workflows/poi-refresh.yml)가 매달 돌리고, 손으로도 돌릴 수 있다.

  python -I scripts/poi-import/refresh_poi.py --env .env              # 새 데이터가 있으면 갱신
  python -I scripts/poi-import/refresh_poi.py --env .env --force      # 같은 분기라도 다시 올림
  python -I scripts/poi-import/refresh_poi.py --zip <zip> --out-csv data/poi/x.csv   # 올리지 않고 CSV 만(검증용)

환경 변수(또는 --env 파일): SUPABASE_URL(없으면 EXPO_PUBLIC_SUPABASE_URL) · SUPABASE_SERVICE_ROLE_KEY(service role/secret 키 — 앱에 넣지 않는다).

갱신 순서(빈 시간 없음):
  1) 새 분기 행을 upsert(같은 상가업소번호는 덮어쓰고 data_date 를 새 날짜로)
  2) 새 날짜 행이 전체의 --min-ratio 이상일 때만 옛 날짜 행(= 그사이 폐업·이전) 삭제 — 파일이 이상하면 지우지 않고 멈춘다
  3) poi_rebuild_dongs() 로 동네 중심 다시 계산
저장된 핀(places)은 poi 를 참조하지 않아 영향이 없다.
"""

import argparse
import csv
import io
import json
import os
import re
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path

DATA_PAGE = "https://www.data.go.kr/data/15083033/fileData.do"
DATA_PK = "15083033"
DATA_DETAIL_PK = "uddi:b3094bc9-8756-4ecc-9141-9144b98a531e"
UA = "CM-poi-refresh/1.0 (+https://github.com/kimi94279-glitch/CM)"

INCLUDE_GROUPS = {"음식", "소매", "예술·스포츠", "숙박"}
INCLUDE_SMALL = {
    "사진촬영업",  # 과학·기술 — 사진관
    "기타 예술/스포츠 교육기관", "레크리에이션 교육기관", "그 외 기타 교육기관", "사회교육시설",  # 교육 — 원데이 클래스·공방
    "목욕탕/사우나", "마사지/안마", "예식장업",  # 수리·개인
    "만화방", "의류 대여업", "스포츠/레크리에이션 용품 대여업", "전시/컨벤션/행사 대행 서비스업",  # 시설관리·임대 — 한복·자전거 대여·전시
}
EXCLUDE_SMALL = {"기숙사/고시원", "복권 발행/판매업"}

COLUMNS = ["id", "source", "name", "branch", "category", "sigungu", "bdong", "road_address", "lat", "lng", "data_date"]


def log(*a):
    print(*a, flush=True)


def load_env(path):
    if not path:
        return
    for line in Path(path).read_text(encoding="utf-8").splitlines():
        m = re.match(r"^([A-Z_][A-Z0-9_]*)=(.*)$", line.strip())
        if m and m.group(1) not in os.environ:
            os.environ[m.group(1)] = m.group(2).strip().strip('"').strip("'")


def http(method, url, headers=None, body=None, timeout=120, retries=3):
    data = None if body is None else (body if isinstance(body, bytes) else json.dumps(body, ensure_ascii=False).encode("utf-8"))
    last = None
    for attempt in range(1, retries + 1):
        req = urllib.request.Request(url, data=data, method=method, headers={"User-Agent": UA, **(headers or {})})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as res:
                return res.status, dict(res.headers), res.read()
        except urllib.error.HTTPError as e:
            detail = e.read()[:500].decode("utf-8", "replace")
            if e.code < 500:
                raise RuntimeError(f"{method} {url.split('?')[0]} → {e.code} {detail}") from None
            last = f"{e.code} {detail}"
        except (urllib.error.URLError, TimeoutError) as e:
            last = str(e)
        time.sleep(2 * attempt)
    raise RuntimeError(f"{method} {url.split('?')[0]} 실패: {last}")


# ---------- 공공데이터포털: 최신 파일 ----------

def latest_file():
    form = urllib.parse.urlencode(
        {"publicDataDetailPk": DATA_DETAIL_PK, "publicDataPk": DATA_PK, "atchFileId": "", "fileDetailSn": "1"}
    ).encode()
    _, _, raw = http(
        "POST",
        "https://www.data.go.kr/tcs/dss/selectFileDataDownload.do",
        {"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", "Referer": DATA_PAGE},
        form,
    )
    j = json.loads(raw)
    info = j.get("dataSetFileDetailInfo") or {}
    atch = j.get("atchFileId") or info.get("atchFileId")
    name = info.get("dataNm") or ""
    m = re.search(r"_(\d{8})$", name)
    if not atch or not m:
        raise RuntimeError(f"최신 파일 정보를 못 읽음(atchFileId={atch!r}, dataNm={name!r}) — 포털 응답 형식이 바뀌었는지 확인")
    d = m.group(1)
    return {
        "atchFileId": atch,
        "name": name,
        "date": f"{d[:4]}-{d[4:6]}-{d[6:]}",
        "next": info.get("nextRegistPrarnde"),
        "url": f"https://www.data.go.kr/cmm/cmm/fileDownload.do?atchFileId={atch}&fileDetailSn=1",
    }


def download(url, dest):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Referer": DATA_PAGE})
    with urllib.request.urlopen(req, timeout=900) as res, open(dest, "wb") as f:
        total = int(res.headers.get("Content-Length") or 0)
        got = 0
        while True:
            chunk = res.read(1 << 20)
            if not chunk:
                break
            f.write(chunk)
            got += len(chunk)
        if total and got != total:
            raise RuntimeError(f"다운로드 크기 불일치 {got}/{total}")
    return got


# ---------- 파일 → 행 ----------

def member_name(info):
    if info.flag_bits & 0x800:
        return info.filename
    try:
        return info.filename.encode("cp437").decode("cp949")
    except UnicodeError:
        return info.filename


def keep(row):
    small = row["상권업종소분류명"]
    if small in EXCLUDE_SMALL:
        return False
    return row["상권업종대분류명"] in INCLUDE_GROUPS or small in INCLUDE_SMALL


def rows_from_zip(zip_path, area_token, sido, data_date):
    with zipfile.ZipFile(zip_path) as z:
        member = next((i for i in z.infolist() if f"_{area_token}_" in member_name(i) and member_name(i).endswith(".csv")), None)
        if member is None:
            raise RuntimeError(f"zip 안에 '{area_token}' CSV 가 없음: {[member_name(i) for i in z.infolist()]}")
        log("읽는 파일:", member_name(member), member.file_size, "bytes")
        seen = set()
        with z.open(member) as raw:
            for r in csv.DictReader(io.TextIOWrapper(raw, encoding="utf-8-sig", newline="")):
                if sido and r["시도명"] != sido:
                    continue
                if not keep(r):
                    continue
                pid, name = r["상가업소번호"].strip(), r["상호명"].strip()
                if not pid or not name or pid in seen or not r["경도"] or not r["위도"]:
                    continue
                seen.add(pid)
                yield {
                    "id": pid,
                    "source": "sbiz",
                    "name": name,
                    "branch": r["지점명"].strip() or None,
                    "category": r["상권업종소분류명"] or None,
                    "sigungu": r["시군구명"],
                    "bdong": r["법정동명"],
                    "road_address": r["도로명주소"].strip() or None,
                    "lat": round(float(r["위도"]), 7),
                    "lng": round(float(r["경도"]), 7),
                    "data_date": data_date,
                }


# ---------- Supabase(REST, service role) ----------

class Db:
    def __init__(self, url, key):
        self.base = url.rstrip("/") + "/rest/v1"
        self.h = {"apikey": key, "Content-Type": "application/json"}
        if key.startswith("eyJ"):  # 예전 service_role JWT. 새 sb_secret_ 키는 apikey 헤더만.
            self.h["Authorization"] = f"Bearer {key}"

    def count(self, query=""):
        _, headers, _ = http("GET", f"{self.base}/poi?select=id{query}", {**self.h, "Prefer": "count=exact", "Range": "0-0"})
        rng = headers.get("Content-Range") or headers.get("content-range") or "*/0"
        return int(rng.split("/")[-1])

    def max_date(self):
        _, _, raw = http("GET", f"{self.base}/poi?select=data_date&order=data_date.desc&limit=1", self.h)
        rows = json.loads(raw)
        return rows[0]["data_date"] if rows else None

    def upsert(self, batch):
        http("POST", f"{self.base}/poi?on_conflict=id", {**self.h, "Prefer": "resolution=merge-duplicates,return=minimal"}, batch, timeout=180)

    def delete_older(self, data_date):
        http("DELETE", f"{self.base}/poi?data_date=lt.{data_date}", {**self.h, "Prefer": "return=minimal"}, timeout=300)

    def dongs_count(self):
        _, headers, _ = http("GET", f"{self.base}/poi_dongs?select=bdong", {**self.h, "Prefer": "count=exact", "Range": "0-0"})
        rng = headers.get("Content-Range") or headers.get("content-range") or "*/0"
        return int(rng.split("/")[-1])

    def rebuild_dongs(self):
        _, _, raw = http("POST", f"{self.base}/rpc/poi_rebuild_dongs", self.h, {}, timeout=300)
        return json.loads(raw)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--env", help=".env 경로(없으면 환경 변수만)")
    ap.add_argument("--area", default="서울", help="zip 안 파일 이름의 지역 토큰(서울·경기 …)")
    ap.add_argument("--sido", default="서울특별시", help="행의 시도명 필터")
    ap.add_argument("--zip", help="이미 받은 zip(주면 다운로드 생략)")
    ap.add_argument("--date", help="데이터 기준일 YYYY-MM-DD(--zip 일 때 최신 정보 대신)")
    ap.add_argument("--out-csv", help="올리지 않고 CSV 로만 쓴다(검증용)")
    ap.add_argument("--force", action="store_true", help="같은 분기라도 다시 올린다")
    ap.add_argument("--batch", type=int, default=2000)
    ap.add_argument("--min-ratio", type=float, default=0.8, help="새 분기 행이 이 비율 이상일 때만 옛 행 삭제")
    args = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
    load_env(args.env)

    latest = None
    if args.zip and args.date:
        data_date = args.date
    else:
        latest = latest_file()
        data_date = latest["date"]
        log(f"포털 최신: {latest['name']} (기준일 {data_date}, 다음 등록 예정 {latest['next']})")

    db = None
    if not args.out_csv:
        url = os.environ.get("SUPABASE_URL") or os.environ.get("EXPO_PUBLIC_SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            raise SystemExit("SUPABASE_URL(또는 EXPO_PUBLIC_SUPABASE_URL)·SUPABASE_SERVICE_ROLE_KEY 가 필요합니다")
        db = Db(url, key)
        current = db.max_date()
        older = db.count(f"&data_date=lt.{data_date}")
        log(f"우리 poi: 기준일 {current}, {db.count()}건(이번 기준일보다 옛 행 {older})")
        # 옛 행이 남아 있으면(지난 실행이 안전 멈춤 등으로 마무리 못 함) 다시 올리고 마무리한다
        if current and current >= data_date and older == 0 and not args.force:
            # 지난 실행이 동네 중심 계산 직전에 멈췄으면 그것만 마저 한다
            if db.dongs_count() == 0:
                log(f"동네 중심이 비어 있어 다시 계산: {db.rebuild_dongs()}개")
            log("이미 최신 — 할 일 없음")
            return

    with tempfile.TemporaryDirectory() as tmp:
        zip_path = args.zip
        if not zip_path:
            zip_path = str(Path(tmp) / "sangga.zip")
            log("내려받는 중…", latest["url"].split("?")[0])
            log("받음", download(latest["url"], zip_path), "bytes")
        rows = rows_from_zip(zip_path, args.area, args.sido, data_date)

        if args.out_csv:
            out = Path(args.out_csv)
            out.parent.mkdir(parents=True, exist_ok=True)
            n = 0
            with open(out, "w", encoding="utf-8", newline="") as f:
                w = csv.writer(f)
                w.writerow(COLUMNS)
                for r in rows:
                    w.writerow(["" if r[c] is None else r[c] for c in COLUMNS])
                    n += 1
            log(f"CSV {n}건 → {out} ({out.stat().st_size} bytes)")
            return

        batch, n, t0 = [], 0, time.time()
        for r in rows:
            batch.append(r)
            if len(batch) >= args.batch:
                db.upsert(batch)
                n += len(batch)
                batch = []
                if n % (args.batch * 25) == 0:
                    log(f"  {n}건 올림 ({time.time() - t0:.0f}s)")
        if batch:
            db.upsert(batch)
            n += len(batch)
        log(f"올림 {n}건 ({time.time() - t0:.0f}s)")

    fresh, total = db.count(f"&data_date=eq.{data_date}"), db.count()
    log(f"새 기준일 행 {fresh} / 전체 {total}")
    if total == 0 or fresh < args.min_ratio * total:
        raise SystemExit(f"새 데이터가 너무 적어서({fresh}/{total}) 옛 행을 지우지 않고 멈춤 — 파일을 확인하세요")
    db.delete_older(data_date)
    dongs = db.rebuild_dongs()
    log(f"완료: poi {db.count()}건(기준일 {data_date}), 동네 {dongs}개, 정리된 옛 행 {total - fresh}건")


if __name__ == "__main__":
    main()
