import { Client } from '@notionhq/client';

import type { Config } from './types';

export type Props = Record<string, unknown>;

type CreateArg = Parameters<Client['pages']['create']>[0];
type UpdateArg = Parameters<Client['pages']['update']>[0];
type QueryArg = Parameters<Client['databases']['query']>[0];

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// 429/5xx 지수 백오프 재시도
async function callNotion<T>(fn: () => Promise<T>, tries = 4): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (e) {
      const status = (e as { status?: number }).status;
      const retryable = status === 429 || (typeof status === 'number' && status >= 500);
      if (i >= tries - 1 || !retryable) throw e;
      await sleep(500 * 2 ** i);
    }
  }
}

export function makeClient(token: string): Client {
  return new Client({ auth: token });
}

// DB에 필요한 속성이 존재하는지 사전 검증(없으면 명확한 에러로 중단)
export async function guardSchema(
  client: Client,
  dbId: string,
  required: string[]
): Promise<void> {
  const db = await callNotion(() => client.databases.retrieve({ database_id: dbId }));
  const props = (db as { properties: Record<string, unknown> }).properties;
  const missing = required.filter((k) => !(k in props));
  if (missing.length) {
    throw new Error(`Notion DB(${dbId}) 누락 속성: ${missing.join(', ')}`);
  }
}

// 고유키(Number)로 페이지 검색
export async function findByNumber(
  client: Client,
  dbId: string,
  prop: string,
  value: number
): Promise<string | null> {
  const arg = {
    database_id: dbId,
    filter: { property: prop, number: { equals: value } },
    page_size: 1,
  } as unknown as QueryArg;
  const res = await callNotion(() => client.databases.query(arg));
  const first = (res as { results: { id: string }[] }).results[0];
  return first ? first.id : null;
}

// 고유키(rich_text)로 페이지 검색
export async function findByText(
  client: Client,
  dbId: string,
  prop: string,
  value: string
): Promise<string | null> {
  const arg = {
    database_id: dbId,
    filter: { property: prop, rich_text: { equals: value } },
    page_size: 1,
  } as unknown as QueryArg;
  const res = await callNotion(() => client.databases.query(arg));
  const first = (res as { results: { id: string }[] }).results[0];
  return first ? first.id : null;
}

// upsert: 있으면 update, 없으면 create. 반환값 = 'created' | 'updated'
export async function upsert(
  client: Client,
  dbId: string,
  existingId: string | null,
  properties: Props
): Promise<'created' | 'updated'> {
  if (existingId) {
    const arg = { page_id: existingId, properties } as unknown as UpdateArg;
    await callNotion(() => client.pages.update(arg));
    await sleep(334);
    return 'updated';
  }
  const arg = { parent: { database_id: dbId }, properties } as unknown as CreateArg;
  await callNotion(() => client.pages.create(arg));
  await sleep(334);
  return 'created';
}

// ---- Notion property 빌더 ----
export const prop = {
  title: (t: string) => ({ title: [{ text: { content: t } }] }),
  number: (n: number) => ({ number: n }),
  select: (name: string) => ({ select: { name } }),
  multi: (names: string[]) => ({ multi_select: names.map((name) => ({ name })) }),
  rich: (t: string) => ({ rich_text: [{ text: { content: t } }] }),
  url: (u: string) => ({ url: u }),
  date: (iso: string) => ({ date: { start: iso } }),
};

export function requireWriteConfig(
  cfg: Config,
  dbId: string | null,
  label: string
): { token: string; db: string } {
  if (!cfg.notionToken || !dbId) {
    throw new Error(
      `${label} 동기화에는 NOTION_TOKEN 과 대상 DB ID가 필요합니다(.env 확인). dry-run은 --dry-run 으로 가능합니다.`
    );
  }
  return { token: cfg.notionToken, db: dbId };
}
