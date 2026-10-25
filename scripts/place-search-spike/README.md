# place-search-spike

ADR-016 스파이크: 소상공인시장진흥공단 상가(상권)정보(서울)로 만든 자체 검색 시제품을, 현재 배포된 `place-search`(카카오 로컬) 결과와 데이트 검색어 30개로 비교한다.

## 실행

1. 공공데이터포털에서 `소상공인시장진흥공단_상가(상권)정보_YYYYMMDD.zip` 을 받아 레포 밖에 풀고, 서울 CSV 경로를 확인한다.
2. 표준 라이브러리만 쓰므로 설치할 것은 없다.

```bash
python -I scripts/place-search-spike/spike.py --csv <서울 CSV> --queries scripts/place-search-spike/queries.json --env .env --out <결과 폴더>
```

- `--env` 를 빼면 카카오 비교 없이 자체 검색만 측정한다.
- 결과: `<결과 폴더>/spike_results.json` (요약 + 검색어별 판정, 자체 검색 상위 5건).
  카카오 결과는 ADR-016 원칙대로 판정(순위/건수)만 남기고 이름·좌표는 저장하지 않는다.

## 판정 규칙

- `named` / `landmark`: 상위 5건 안에 기대 이름 키워드 + 기대 시군구가 맞는 결과가 있으면 성공(순위 기록).
- `category`: 상위 5건 중 업종/상호에 카테고리 키워드 + 기대 시군구가 맞는 결과가 3건 이상이면 성공.
  카카오 응답에는 업종이 없어 카카오 쪽은 시군구 일치 건수만 센다.
- `v1` = 데이터 필드만, `v2` = 동네 별칭표(홍대→서교동 등) 추가.

## 시드 파일럿

`pilot_seed.json` = 웹 리서치로 뽑은 성수·연남·익선 데이트 장소 100곳(이름·동네·종류·출처 URL — 사실만).

```bash
python -I scripts/place-search-spike/pilot_match.py --csv <서울 CSV> --seed scripts/place-search-spike/pilot_seed.json --out <결과 폴더>
```

자동 매칭엔 오매칭(짧은 상호, 랜드마크 이름을 딴 가게)이 섞이므로 결과의 `examples` 를 사람이 확인한다. 결과 요약은 ADR-016 "시드 파일럿 결과".

데이터 파일은 레포에 넣지 않는다.
