# notion-sync

Git(Source of Truth) → Notion **단방향** 문서 동기화. Notion은 포털/인덱스 역할만 하며, **본문은 복제하지 않고 Git permalink로 링크**한다.

## 범위 (V1)

- **ADR Sync** (`docs/ADR/*.md` → Notion ADR DB) — Unique Key = `No.`
- **Documentation Sync** (지정 문서 → Notion Documentation DB) — Unique Key = `Path`

제외: TASK/Dashboard/Development Log/Commit/역방향 동기화.

## 사전 준비

1. Notion에 DB 2개 생성 (속성은 아래 표 참고).
2. 인테그레이션 토큰 발급 후 두 DB를 인테그레이션에 **공유**.
3. `.env` 작성 (`.env.example` 참고).

### ADR DB 속성 (이름/타입 정확히 일치)

| 이름 | 타입 |
| --- | --- |
| ADR | Title |
| No. | Number |
| Status | Select |
| Category | Select |
| Tags | Multi-select |
| Owner | Text |
| Date | Date |
| Last Review | Date |
| Related | Multi-select |
| Git Path | URL |
| Summary | Text |
| Synced At | Date |

### Documentation DB 속성 (이름/타입 정확히 일치)

| 이름 | 타입 |
| --- | --- |
| Doc | Title |
| Path | Text |
| Git Path | URL |
| Category | Select |
| Source Type | Select |
| Status | Select (Active / Archived / Draft) |
| Updated | Date |
| Summary | Text |
| Synced At | Date |

## 설치 & 실행

```bash
cd scripts/notion-sync
npm install

# 오프라인 미리보기(쓰기 없음, 토큰 불필요)
npm run sync -- --target=adr --dry-run

# 실제 동기화(.env 필요)
npm run sync -- --target=adr

npm run typecheck
npm run lint
```

> Windows에서 Python 등 다른 도구와 무관. 이 패키지는 Node 전용이며 루트 Expo 앱 빌드와 분리되어 있다.

## 원칙

- 단방향(Git→Notion). Notion의 관리 속성은 매 실행 Git 기준으로 덮어씀.
- 멱등 upsert(고유키 조회 후 update/create) → 재실행 안전.
- 본문 비복제(메타 + 짧은 요약 + Git 링크).
