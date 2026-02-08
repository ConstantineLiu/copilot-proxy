// ── ensure-internal-token.ts ────────────────────────────────────────
// [INPUT]: apikey-storage, token-storage, copilot-token-meta
// [OUTPUT]: ensureInternalToken() - validates API key then resolves bearer token
// [POS]: API auth layer: API key validation → token selection → Copilot auth
// [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
// ────────────────────────────────────────────────────────────────────
import { getApiKeyByKey, getApiKeys } from '@/entities/apikey/api/apikey-storage';
import { getBearerToken } from '@/entities/token/api/copilot-token-meta';
import { getSelectedToken, getToken, getTokens } from '@/entities/token/api/token-storage';
import { log } from '@/shared/lib/logger';
import { maskToken } from '@/shared/lib/mask-token';

let roundRobinIndex = 0;

async function getNextToken(): Promise<string | null> {
  const tokens = await getTokens();
  if (tokens.length === 0) return null;
  const token = tokens[roundRobinIndex % tokens.length];
  roundRobinIndex = (roundRobinIndex + 1) % tokens.length;
  log.info({ 'Round-robin': `${roundRobinIndex}/${tokens.length}` });
  return token.token;
}

async function getDefaultOrNextToken(): Promise<string | null> {
  const selected = await getSelectedToken();
  if (selected?.token) return selected.token;
  return getNextToken();
}

async function resolveOAuthToken(headerValue: string): Promise<{ oauthToken?: string; error?: Response }> {
  // Always require an API key for /api/* requests.
  // Admin UI can create API keys on port 3000 (dashboard), then clients pass it via:
  //   Authorization: Bearer <api-key>
  if (!headerValue) {
    const apiKeys = await getApiKeys();
    const msg = apiKeys.length === 0 ? 'API key required (no API keys configured)' : 'API key required';
    return { error: new Response(msg, { status: 401 }) };
  }

  // ── has Authorization header: check API key first ────────────────
  const apiKey = await getApiKeyByKey(headerValue);
  if (apiKey) {
    if (apiKey.tokenId) {
      const linked = await getToken(apiKey.tokenId);
      if (!linked) {
        return { error: new Response('Linked token not found', { status: 500 }) };
      }
      log.info({ 'API key': apiKey.name, 'Linked token': linked.name });
      return { oauthToken: linked.token };
    }
    log.info({ 'API key': apiKey.name, mode: 'round-robin' });
    const token = await getNextToken();
    return token ? { oauthToken: token } : { error: new Response('No tokens configured', { status: 401 }) };
  }

  return { error: new Response('Invalid API key', { status: 401 }) };
}

export async function ensureInternalToken(event) {
  const authHeader = event.request.headers.get('authorization');
  const headerValue = (authHeader?.replace(/^(token|bearer)\s+/i, '') || '').trim();

  const { oauthToken, error } = await resolveOAuthToken(headerValue);
  if (error) return { error };

  log.info({ 'Use token': maskToken(oauthToken) });

  try {
    const bearerToken = await getBearerToken(oauthToken);
    return { bearerToken };
  } catch (err) {
    log.error(`Error fetching Bearer token: ${err.message}`);
    return { error: new Response(`Internal server error: ${err.message}`, { status: 500 }) };
  }
}
