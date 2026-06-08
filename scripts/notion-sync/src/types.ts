// 동기화 도메인 타입

export interface Config {
  notionToken: string | null;
  adrDbId: string | null;
  docsDbId: string | null;
  repoBaseUrl: string;
  repoRef: string;
}

export interface SyncReport {
  created: number;
  updated: number;
  skipped: number;
}

// 지정 문서 → Documentation DB 레코드
export interface DocRecord {
  title: string;
  relPath: string; // Unique Key
  gitUrl: string;
  category: string;
  sourceType: string;
  status: string; // Active | Archived | Draft
  updated: string; // ISO (git commit date → mtime fallback)
  summary: string;
}

// docs/ADR/*.md → ADR DB 레코드
export interface AdrRecord {
  no: number;
  title: string;
  status: string | null;
  category: string | null;
  tags: string[];
  owner: string | null;
  date: string | null;
  lastReview: string | null;
  related: string[];
  summary: string;
  gitUrl: string;
}
