// ── apikey/model/apikey-item.ts ─────────────────────────────────────
// [INPUT]: apikey-storage, token-storage, @solidjs/router
// [OUTPUT]: SolidStart query/action for API key CRUD
// [POS]: Server-side model layer, bridges storage to UI via query/action
// [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
// ────────────────────────────────────────────────────────────────────
import * as apiKeyStorage from '@/entities/apikey/api/apikey-storage';
import * as tokenStorage from '@/entities/token/api/token-storage';
import { maskToken } from '@/shared/lib/mask-token';
import { action, query, revalidate } from '@solidjs/router';
import type { ApiKeyDisplay } from './types';

export const getApiKeyList = query(async (): Promise<ApiKeyDisplay[]> => {
  'use server';
  const apiKeys = await apiKeyStorage.getApiKeys();
  const tokens = await tokenStorage.getTokens();

  return apiKeys
    .map((item) => {
      const linkedToken = item.tokenId ? tokens.find((t) => t.id === item.tokenId) : null;
      return {
        id: item.id,
        name: item.name,
        maskedKey: maskToken(item.key),
        tokenId: item.tokenId,
        tokenName: linkedToken?.name || null,
        createdAt: item.createdAt,
      };
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}, 'apikeys');

export const refetchApiKeyList = () => revalidate(getApiKeyList.key);

export const addApiKey = action(async (name: string, tokenId: string | null) => {
  'use server';
  if (!name) return null;
  const item = await apiKeyStorage.createApiKey(name, tokenId);
  return item;
}, 'addApiKey');

export const removeApiKey = action(async (id: string) => {
  'use server';
  await apiKeyStorage.removeApiKey(id);
}, 'removeApiKey');
