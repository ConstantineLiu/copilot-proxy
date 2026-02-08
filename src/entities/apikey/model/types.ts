// ── apikey/model/types.ts ───────────────────────────────────────────
// [INPUT]: none
// [OUTPUT]: ApiKeyItem, ApiKeyDisplay type definitions
// [POS]: API key domain types, consumed by storage, model, and UI layers
// [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
// ────────────────────────────────────────────────────────────────────
export interface ApiKeyItem {
  id: string;
  name: string;
  key: string;
  tokenId: string | null; // null = global (round-robin all tokens)
  createdAt: number;
}

export interface ApiKeyDisplay {
  id: string;
  name: string;
  maskedKey: string;
  tokenId: string | null;
  tokenName: string | null;
  createdAt: number;
}
