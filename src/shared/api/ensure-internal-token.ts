// ── ensure-internal-token.ts ────────────────────────────────────────
// [INPUT]: token-storage (getTokens/getSelectedToken), copilot-token-meta
// [OUTPUT]: ensureInternalToken() - resolves OAuth token to bearer token
// [POS]: API auth layer, round-robin across all tokens when no header provided
// [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
// ────────────────────────────────────────────────────────────────────
import { getBearerToken } from '@/entities/token/api/copilot-token-meta';
import { getTokens } from '@/entities/token/api/token-storage';
import { log } from '@/shared/lib/logger';
import { maskToken } from '@/shared/lib/mask-token';

const EMPTY_TOKEN = '_';
let roundRobinIndex = 0;

async function getNextToken(): Promise<string | null> {
  const tokens = await getTokens();
  if (tokens.length === 0) return null;
  const token = tokens[roundRobinIndex % tokens.length];
  roundRobinIndex = (roundRobinIndex + 1) % tokens.length;
  log.info({ 'Round-robin': `${roundRobinIndex}/${tokens.length}` });
  return token.token;
}

export async function ensureInternalToken(event) {
  const authHeader = event.request.headers.get('authorization');
  const providedToken = authHeader?.replace(/^(token|Bearer) ?/, '') || EMPTY_TOKEN;
  const oauthToken = providedToken === EMPTY_TOKEN ? await getNextToken() : providedToken;

  if (!oauthToken) {
    return {
      error: new Response('Do login or provide a GitHub token in the Authorization header', {
        status: 401,
      }),
    };
  }
  log.info({ 'Use token': maskToken(oauthToken) });

  try {
    const bearerToken = await getBearerToken(oauthToken);
    return { bearerToken };
  } catch (error) {
    log.error(`Error fetching Bearer token from ${oauthToken}: ${error.message}`);
    return { error: new Response(`Internal server error: ${error.message}`, { status: 500 }) };
  }
}
