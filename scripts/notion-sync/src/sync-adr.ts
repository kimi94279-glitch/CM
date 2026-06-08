import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';

import matter from 'gray-matter';

import {
  asDateStr,
  asString,
  asStringArray,
  getRepoRoot,
  gitUrl,
  summarize,
  toRelPath,
} from './markdown';
import {
  findByNumber,
  guardSchema,
  makeClient,
  prop,
  requireWriteConfig,
  upsert,
  type Props,
} from './notion';
import type { AdrRecord, Config, SyncReport } from './types';

const ADR_DIR = 'docs/ADR';
const REQUIRED_PROPS = [
  'ADR',
  'No.',
  'Status',
  'Category',
  'Tags',
  'Owner',
  'Date',
  'Last Review',
  'Related',
  'Git Path',
  'Summary',
  'Synced At',
];

function adrNumber(data: Record<string, unknown>, fileStem: string): number | null {
  const fromFm = data.adr;
  if (fromFm !== null && fromFm !== undefined) {
    const n = parseInt(String(fromFm), 10);
    if (!Number.isNaN(n)) return n;
  }
  const m = fileStem.match(/ADR-(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}

function readAdrRecords(cfg: Config): AdrRecord[] {
  const root = getRepoRoot();
  const dir = join(root, ADR_DIR);
  const files = readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.md'));

  const records: AdrRecord[] = [];
  for (const file of files) {
    const abs = join(dir, file);
    const stem = basename(file, '.md');
    const parsed = matter(readFileSync(abs, 'utf8'));
    const data = parsed.data as Record<string, unknown>;

    const no = adrNumber(data, stem);
    if (no === null) continue;

    const relPath = toRelPath(root, abs);
    records.push({
      no,
      title: stem, // 파일명에 "ADR-0xx <제목>"이 이미 포함됨
      status: asString(data.status),
      category: asString(data.category),
      tags: asStringArray(data.tags),
      owner: asString(data.owner),
      date: asDateStr(data.date),
      lastReview: asDateStr(data.last_review),
      related: asStringArray(data.related),
      summary: summarize(parsed.content),
      gitUrl: gitUrl(cfg, relPath),
    });
  }
  records.sort((a, b) => a.no - b.no);
  return records;
}

function buildProps(r: AdrRecord): Props {
  const p: Props = {};
  p['ADR'] = prop.title(r.title);
  p['No.'] = prop.number(r.no);
  if (r.status) p['Status'] = prop.select(r.status);
  if (r.category) p['Category'] = prop.select(r.category);
  if (r.tags.length) p['Tags'] = prop.multi(r.tags);
  if (r.owner) p['Owner'] = prop.rich(r.owner);
  if (r.date) p['Date'] = prop.date(r.date);
  if (r.lastReview) p['Last Review'] = prop.date(r.lastReview);
  if (r.related.length) p['Related'] = prop.multi(r.related);
  p['Git Path'] = prop.url(r.gitUrl);
  if (r.summary) p['Summary'] = prop.rich(r.summary);
  p['Synced At'] = prop.date(new Date().toISOString());
  return p;
}

export async function syncAdr(cfg: Config, dryRun: boolean): Promise<SyncReport> {
  const records = readAdrRecords(cfg);

  if (dryRun) {
    console.log(`\n[ADR] dry-run — ${records.length}건 파싱됨 (Notion 쓰기 없음)`);
    for (const r of records) {
      console.log(
        `  ADR-${String(r.no).padStart(3, '0')} | status=${r.status ?? '-'} | tags=${r.tags.length} | related=${r.related.length}`
      );
      console.log(`      title: ${r.title}`);
      console.log(`      git  : ${r.gitUrl}`);
      console.log(`      sum  : ${r.summary || '(없음)'}`);
    }
    return { created: 0, updated: 0, skipped: records.length };
  }

  const { token, db } = requireWriteConfig(cfg, cfg.adrDbId, 'ADR');
  const client = makeClient(token);
  await guardSchema(client, db, REQUIRED_PROPS);

  const report: SyncReport = { created: 0, updated: 0, skipped: 0 };
  for (const r of records) {
    const existing = await findByNumber(client, db, 'No.', r.no);
    const result = await upsert(client, db, existing, buildProps(r));
    if (result === 'created') report.created++;
    else report.updated++;
  }
  return report;
}
