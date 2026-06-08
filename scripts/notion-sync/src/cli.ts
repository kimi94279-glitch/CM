import { loadConfig } from './config';
import { syncAdr } from './sync-adr';
import { syncDocs } from './sync-docs';
import type { SyncReport } from './types';

type Target = 'adr' | 'docs' | 'all';

function parseArgs(argv: string[]): { target: Target; dryRun: boolean } {
  const dryRun = argv.includes('--dry-run');
  const targetArg = argv.find((a) => a.startsWith('--target='))?.split('=')[1];
  const target = (targetArg as Target) || 'all';
  if (!['adr', 'docs', 'all'].includes(target)) {
    throw new Error(`알 수 없는 --target: ${target} (adr|docs|all)`);
  }
  return { target, dryRun };
}

function logReport(label: string, r: SyncReport): void {
  console.log(`[${label}] created=${r.created} updated=${r.updated} skipped=${r.skipped}`);
}

async function main(): Promise<void> {
  const { target, dryRun } = parseArgs(process.argv.slice(2));
  const cfg = loadConfig();

  if (target === 'adr' || target === 'all') {
    logReport('ADR', await syncAdr(cfg, dryRun));
  }

  if (target === 'docs' || target === 'all') {
    logReport('DOCS', await syncDocs(cfg, dryRun));
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
