import { COPILOT_API_HOST, COPILOT_HEADERS } from '@/shared/config/config';
import { log } from '@/shared/lib/logger';
import type { APIEvent } from '@solidjs/start/server';
import { maskToken } from '../mask-token';
import { readJson } from '../stream-helper';
import type { HandlerConfig } from './types';

function sanitizeHeadersForLog(headers: Headers): Record<string, string> {
  const obj = Object.fromEntries(headers.entries());
  const auth = obj.authorization;
  if (auth) {
    obj.authorization = auth.replace(/^(Bearer)\s+(.+)$/i, (_, scheme, token) => `${scheme} ${maskToken(token)}`);
  }
  return obj;
}

export async function getHandlerConfig(
  event: APIEvent,
  bearerToken: string,
): Promise<HandlerConfig> {
  const url = new URL(event.request.url);
  const targetPath = url.pathname.replace(/^\/api/, '');
  const targetUrl = `https://${COPILOT_API_HOST}${targetPath}${url.search}`;

  // Prepare headers
  const headers = new Headers(event.request.headers);
  COPILOT_HEADERS && Object.entries(COPILOT_HEADERS).forEach(([k, v]) => headers.set(k, v));
  headers.set('authorization', `Bearer ${bearerToken}`);
  headers.set('host', COPILOT_API_HOST);

  // Clone body to avoid consuming the original request stream.
  // Only attempt JSON parsing for JSON requests; other endpoints should still proxy.
  let bodyJson: Record<string, unknown> = {};
  const contentType = headers.get('content-type') || '';
  const clonedBody = event.request.clone().body;
  if (clonedBody && contentType.includes('application/json')) {
    try {
      bodyJson = await readJson(clonedBody);
    } catch (e) {
      // Don't fail proxying just because debug parsing fails.
      const err = e instanceof Error ? e.message : String(e);
      log.debug({ err }, 'Failed to parse JSON body (ignored)');
      bodyJson = {};
    }
  }

  log.debug(
    { headers: sanitizeHeadersForLog(headers), bodyJson },
    'Headers and parsed body (if JSON) for proxying to Copilot',
  );

  const config = {
    bearerToken,
    headers,
    bodyJson,
    targetUrl,
    targetPath,
    request: event.request,
  };

  return config;
}
