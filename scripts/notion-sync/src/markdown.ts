import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Config } from './types';

// 이 파일: scripts/notion-sync/src/markdown.ts → repo root = 3단계 상위
export function getRepoRoot(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, '..', '..', '..');
}

// repo root 기준 상대경로(슬래시 정규화)
export function toRelPath(root: string, absPath: string): string {
  return relative(root, absPath).split('\\').join('/');
}

// Git permalink (본문 진입점). 본문은 Notion에 복제하지 않는다.
export function gitUrl(cfg: Config, relPath: string): string {
  const encoded = relPath
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
  return `${cfg.repoBaseUrl}/blob/${cfg.repoRef}/${encoded}`;
}

// frontmatter 값 강제 변환 헬퍼
export function asString(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s : null;
}

export function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  const s = asString(v);
  return s ? [s] : [];
}

// YAML date(자동 Date 파싱)·문자열 모두 'YYYY-MM-DD'로 정규화
export function asDateStr(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  return s ? s.slice(0, 10) : null;
}

// 본문 첫 단락을 요약으로 추출(헤딩/구분선/리스트/표/코드펜스 제외). 본문 복제 아님(짧은 요약).
export function summarize(content: string, max = 300): string {
  const lines = content.split(/\r?\n/);
  const buf: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      if (buf.length) break;
      continue;
    }
    if (/^(#|>|\||`{3}|---|===|[-*+]\s|\d+\.\s)/.test(line)) {
      if (buf.length) break;
      continue;
    }
    // ADR 헤더 관용구(Date:/Status:)는 요약에서 제외
    if (/^(date|status)\s*:/i.test(line)) {
      if (buf.length) break;
      continue;
    }
    buf.push(line);
  }
  let s = buf.join(' ').replace(/\s+/g, ' ').trim();
  if (s.length > max) s = s.slice(0, max - 1) + '…';
  return s;
}

// Git 최종 커밋일(ISO) 우선, 실패 시 fs.mtime fallback
export function lastModified(root: string, relPath: string): string {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cI', '--', relPath], {
      cwd: root,
      encoding: 'utf8',
    }).trim();
    if (out) return out;
  } catch {
    // git 실패 시 아래 fallback
  }
  try {
    return statSync(resolve(root, relPath)).mtime.toISOString();
  } catch {
    return new Date().toISOString();
  }
}
