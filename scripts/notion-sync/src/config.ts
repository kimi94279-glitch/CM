import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { config as loadDotenv } from 'dotenv';

import type { Config } from './types';

// .env 를 cwd 와 무관하게 패키지 루트 기준으로 명시 로드한다.
// (config.ts: scripts/notion-sync/src/config.ts → 패키지 루트는 한 단계 위)
const PKG_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
loadDotenv({ path: resolve(PKG_ROOT, '.env'), quiet: true });

const DEFAULT_REPO_BASE = 'https://github.com/kimi94279-glitch/CM';
const DEFAULT_REF = 'main';

// 환경변수에서 설정 로드. 토큰/DB ID는 dry-run 시 없을 수 있어 null 허용.
export function loadConfig(): Config {
  return {
    notionToken: process.env.NOTION_TOKEN || null,
    adrDbId: process.env.NOTION_DB_ADR || null,
    docsDbId: process.env.NOTION_DB_DOCS || null,
    repoBaseUrl: (process.env.REPO_BASE_URL || DEFAULT_REPO_BASE).replace(/\/+$/, ''),
    repoRef: process.env.REPO_REF || DEFAULT_REF,
  };
}
