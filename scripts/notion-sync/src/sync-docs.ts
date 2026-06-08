import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import matter from 'gray-matter';

import { asString, getRepoRoot, gitUrl, lastModified, summarize } from './markdown';
import {
  findByText,
  guardSchema,
  makeClient,
  prop,
  requireWriteConfig,
  upsert,
  type Props,
} from './notion';
import type { Config, DocRecord, SyncReport } from './types';

// 인덱싱 대상 문서(allowlist). category/sourceType 은 명시 분류.
interface DocSource {
  relPath: string;
  category: string;
  sourceType: string;
}

const DOC_SOURCES: DocSource[] = [
  { relPath: 'README.md', category: 'Overview', sourceType: 'Guide' },
  { relPath: 'PRD.md', category: 'Product', sourceType: 'Spec' },
  { relPath: 'DESIGN.md', category: 'Design', sourceType: 'Spec' },
  { relPath: 'DATABASE.md', category: 'Architecture', sourceType: 'Reference' },
  { relPath: 'ARCHITECTURE.md', category: 'Architecture', sourceType: 'Reference' },
  { relPath: 'docs/MAP CANVAS.md', category: 'Product', sourceType: 'Spec' },
];

const REQUIRED_PROPS = [
  'Doc',
  'Path',
  'Git Path',
  'Category',
  'Source Type',
  'Status',
  'Updated',
  'Summary',
  'Synced At',
];

function stemOf(relPath: string): string {
  const base = relPath.split('/').pop() ?? relPath;
  return base.replace(/\.md$/i, '');
}

function deriveStatus(relPath: string, data: Record<string, unknown>): string {
  if (relPath.startsWith('docs/archive/')) return 'Archived';
  const s = (asString(data.status) ?? '').toLowerCase();
  if (s === 'draft') return 'Draft';
  if (['archived', 'deprecated', 'superseded'].includes(s)) return 'Archived';
  return 'Active';
}

function readDocRecords(cfg: Config): DocRecord[] {
  const root = getRepoRoot();
  const records: DocRecord[] = [];

  for (const src of DOC_SOURCES) {
    const abs = join(root, src.relPath);
    if (!existsSync(abs)) {
      console.warn(`  ⚠ 누락(건너뜀): ${src.relPath}`);
      continue;
    }
    const parsed = matter(readFileSync(abs, 'utf8'));
    const data = parsed.data as Record<string, unknown>;

    records.push({
      title: asString(data.title) ?? stemOf(src.relPath),
      relPath: src.relPath,
      gitUrl: gitUrl(cfg, src.relPath),
      category: src.category,
      sourceType: src.sourceType,
      status: deriveStatus(src.relPath, data),
      updated: lastModified(root, src.relPath),
      summary: summarize(parsed.content),
    });
  }
  return records;
}

function buildProps(r: DocRecord): Props {
  const p: Props = {};
  p['Doc'] = prop.title(r.title);
  p['Path'] = prop.rich(r.relPath);
  p['Git Path'] = prop.url(r.gitUrl);
  p['Category'] = prop.select(r.category);
  p['Source Type'] = prop.select(r.sourceType);
  p['Status'] = prop.select(r.status);
  p['Updated'] = prop.date(r.updated);
  if (r.summary) p['Summary'] = prop.rich(r.summary);
  p['Synced At'] = prop.date(new Date().toISOString());
  return p;
}

export async function syncDocs(cfg: Config, dryRun: boolean): Promise<SyncReport> {
  const records = readDocRecords(cfg);

  if (dryRun) {
    console.log(`\n[DOCS] dry-run — ${records.length}건 파싱됨 (Notion 쓰기 없음)`);
    for (const r of records) {
      console.log(
        `  ${r.relPath} | ${r.category}/${r.sourceType} | status=${r.status} | updated=${r.updated.slice(0, 10)}`
      );
      console.log(`      title: ${r.title}`);
      console.log(`      git  : ${r.gitUrl}`);
      console.log(`      sum  : ${r.summary || '(없음)'}`);
    }
    return { created: 0, updated: 0, skipped: records.length };
  }

  const { token, db } = requireWriteConfig(cfg, cfg.docsDbId, 'Documentation');
  const client = makeClient(token);
  await guardSchema(client, db, REQUIRED_PROPS);

  const report: SyncReport = { created: 0, updated: 0, skipped: 0 };
  for (const r of records) {
    const existing = await findByText(client, db, 'Path', r.relPath);
    const result = await upsert(client, db, existing, buildProps(r));
    if (result === 'created') report.created++;
    else report.updated++;
  }
  return report;
}
