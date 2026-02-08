// ── apikey/api/apikey-storage.ts ────────────────────────────────────
// [INPUT]: node-persist, uuid
// [OUTPUT]: CRUD operations for API keys
// [POS]: API key persistence layer, parallel to token-storage
// [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
// ────────────────────────────────────────────────────────────────────
import storage from 'node-persist';
import { v4 as uuid } from 'uuid';
import type { ApiKeyItem } from '../model/types';

const STORAGE_DIR = process.env.STORAGE_DIR || '.storage';

const apiKeyStorage = storage.create({
  dir: `${STORAGE_DIR}/api-keys`,
  ttl: false,
});

await apiKeyStorage.init();

function generateKey(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'sk-';
  for (let i = 0; i < 48; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export async function createApiKey(name: string, tokenId: string | null): Promise<ApiKeyItem> {
  const item: ApiKeyItem = {
    id: uuid(),
    name,
    key: generateKey(),
    tokenId,
    createdAt: Date.now(),
  };
  await apiKeyStorage.setItem(item.id, item);
  return item;
}

export async function getApiKeys(): Promise<ApiKeyItem[]> {
  return (await apiKeyStorage.values()) || [];
}

export async function getApiKeyByKey(key: string): Promise<ApiKeyItem | null> {
  const keys = await apiKeyStorage.values();
  return keys.find((item) => item.key === key) || null;
}

export async function removeApiKey(id: string): Promise<void> {
  await apiKeyStorage.removeItem(id);
}
