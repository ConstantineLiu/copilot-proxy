// ── middleware/index.ts ─────────────────────────────────────────────
// [INPUT]: ADMIN_PASSWORD env var, @/shared/lib/logger
// [OUTPUT]: HTTP logging + admin route Basic Auth protection
// [POS]: Global middleware, guards admin UI while leaving /api/* open
// [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
// ────────────────────────────────────────────────────────────────────
import { logHttp } from '@/shared/lib/logger';
import { createMiddleware } from '@solidjs/start/middleware';
import type { FetchEvent } from '@solidjs/start/server';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

function isApiRoute(url: string): boolean {
  const path = new URL(url).pathname;
  return path.startsWith('/api/');
}

function checkBasicAuth(request: Request): boolean {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Basic ')) return false;

  let decoded = '';
  try {
    decoded = Buffer.from(auth.slice(6), 'base64').toString('utf8');
  } catch {
    return false;
  }
  // Username/password are "user:pass". Password itself may contain ":".
  const sep = decoded.indexOf(':');
  const user = sep === -1 ? decoded : decoded.slice(0, sep);
  const pass = sep === -1 ? '' : decoded.slice(sep + 1);
  return user === 'admin' && pass === ADMIN_PASSWORD;
}

const UNAUTHORIZED = new Response('Unauthorized', {
  status: 401,
  headers: { 'WWW-Authenticate': 'Basic realm="Copilot Proxy Admin"' },
});

export default createMiddleware({
  onRequest: ({ request }: FetchEvent) => {
    if (!ADMIN_PASSWORD) return;
    if (isApiRoute(request.url)) return;
    if (!checkBasicAuth(request)) return UNAUTHORIZED;
  },
  onBeforeResponse: ({ nativeEvent }: FetchEvent) => {
    logHttp(nativeEvent.node.req, nativeEvent.node.res);
  },
});
