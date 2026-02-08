import { describe, expect, it, vi } from 'vitest';

function makeEvent(authHeader?: string) {
  return {
    request: new Request('http://localhost:3000/api/chat/completions', {
      headers: authHeader ? { authorization: authHeader } : {},
    }),
  };
}

describe('ensureInternalToken', () => {
  it('requires API key when Authorization header is missing (even if no API keys exist yet)', async () => {
    vi.resetModules();
    vi.doMock('@/entities/apikey/api/apikey-storage', () => ({
      getApiKeys: vi.fn(async () => []),
      getApiKeyByKey: vi.fn(async () => null),
    }));
    vi.doMock('@/entities/token/api/token-storage', () => ({
      getSelectedToken: vi.fn(async () => ({ id: 't0', name: 'def', token: 'oauth-selected', createdAt: 1 })),
      getTokens: vi.fn(async () => [{ id: 't1', name: 'a', token: 'oauth-a', createdAt: 1 }]),
      getToken: vi.fn(async () => null),
    }));
    vi.doMock('@/entities/token/api/copilot-token-meta', () => ({
      getBearerToken: vi.fn(async (oauth: string) => `bearer-for:${oauth}`),
    }));
    vi.doMock('@/shared/lib/logger', () => ({
      log: { info: vi.fn(), error: vi.fn() },
    }));
    vi.doMock('@/shared/lib/mask-token', () => ({
      maskToken: vi.fn((t: string) => `masked-${t}`),
    }));

    const { ensureInternalToken } = await import('./ensure-internal-token');
    const res = await ensureInternalToken(makeEvent());
    expect(res.error).toBeInstanceOf(Response);
    expect((res.error as Response).status).toBe(401);
  });

  it('treats dummy token "_" as invalid API key when API key is required', async () => {
    vi.resetModules();
    vi.doMock('@/entities/apikey/api/apikey-storage', () => ({
      getApiKeys: vi.fn(async () => []),
      getApiKeyByKey: vi.fn(async () => null),
    }));
    vi.doMock('@/entities/token/api/token-storage', () => ({
      getSelectedToken: vi.fn(async () => ({ id: 't0', name: 'def', token: 'oauth-selected', createdAt: 1 })),
      getTokens: vi.fn(async () => [{ id: 't1', name: 'a', token: 'oauth-a', createdAt: 1 }]),
      getToken: vi.fn(async () => null),
    }));
    vi.doMock('@/entities/token/api/copilot-token-meta', () => ({
      getBearerToken: vi.fn(async (oauth: string) => `bearer-for:${oauth}`),
    }));
    vi.doMock('@/shared/lib/logger', () => ({
      log: { info: vi.fn(), error: vi.fn() },
    }));
    vi.doMock('@/shared/lib/mask-token', () => ({
      maskToken: vi.fn((t: string) => `masked-${t}`),
    }));

    const { ensureInternalToken } = await import('./ensure-internal-token');
    const res = await ensureInternalToken(makeEvent('Bearer _'));
    expect(res.error).toBeInstanceOf(Response);
    expect((res.error as Response).status).toBe(401);
  });

  it('requires API key if API keys exist and Authorization header is missing', async () => {
    vi.resetModules();
    vi.doMock('@/entities/apikey/api/apikey-storage', () => ({
      getApiKeys: vi.fn(async () => [{ id: 'k1' }]),
      getApiKeyByKey: vi.fn(async () => null),
    }));
    vi.doMock('@/entities/token/api/token-storage', () => ({
      getSelectedToken: vi.fn(async () => null),
      getTokens: vi.fn(async () => [{ id: 't1', name: 'a', token: 'oauth-a', createdAt: 1 }]),
      getToken: vi.fn(async () => null),
    }));
    vi.doMock('@/entities/token/api/copilot-token-meta', () => ({
      getBearerToken: vi.fn(async () => 'should-not-be-called'),
    }));
    vi.doMock('@/shared/lib/logger', () => ({
      log: { info: vi.fn(), error: vi.fn() },
    }));
    vi.doMock('@/shared/lib/mask-token', () => ({
      maskToken: vi.fn((t: string) => `masked-${t}`),
    }));

    const { ensureInternalToken } = await import('./ensure-internal-token');
    const res = await ensureInternalToken(makeEvent());
    expect(res.error).toBeInstanceOf(Response);
    expect((res.error as Response).status).toBe(401);
  });

  it('rejects unknown API key when API keys exist', async () => {
    vi.resetModules();
    vi.doMock('@/entities/apikey/api/apikey-storage', () => ({
      getApiKeys: vi.fn(async () => [{ id: 'k1' }]),
      getApiKeyByKey: vi.fn(async () => null),
    }));
    vi.doMock('@/entities/token/api/token-storage', () => ({
      getSelectedToken: vi.fn(async () => null),
      getTokens: vi.fn(async () => [{ id: 't1', name: 'a', token: 'oauth-a', createdAt: 1 }]),
      getToken: vi.fn(async () => null),
    }));
    vi.doMock('@/entities/token/api/copilot-token-meta', () => ({
      getBearerToken: vi.fn(async () => 'should-not-be-called'),
    }));
    vi.doMock('@/shared/lib/logger', () => ({
      log: { info: vi.fn(), error: vi.fn() },
    }));
    vi.doMock('@/shared/lib/mask-token', () => ({
      maskToken: vi.fn((t: string) => `masked-${t}`),
    }));

    const { ensureInternalToken } = await import('./ensure-internal-token');
    const res = await ensureInternalToken(makeEvent('Bearer not-a-key'));
    expect(res.error).toBeInstanceOf(Response);
    expect((res.error as Response).status).toBe(401);
  });

  it('uses linked token when API key is bound to a token', async () => {
    vi.resetModules();
    vi.doMock('@/entities/apikey/api/apikey-storage', () => ({
      getApiKeys: vi.fn(async () => [{ id: 'k1' }]),
      getApiKeyByKey: vi.fn(async (k: string) =>
        k === 'sk-linked' ? { id: 'k1', name: 'linked', key: 'sk-linked', tokenId: 't-linked' } : null,
      ),
    }));
    vi.doMock('@/entities/token/api/token-storage', () => ({
      getSelectedToken: vi.fn(async () => null),
      getTokens: vi.fn(async () => [{ id: 't1', name: 'a', token: 'oauth-a', createdAt: 1 }]),
      getToken: vi.fn(async (id: string) =>
        id === 't-linked' ? { id: 't-linked', name: 'T', token: 'oauth-linked', createdAt: 1 } : null,
      ),
    }));
    vi.doMock('@/entities/token/api/copilot-token-meta', () => ({
      getBearerToken: vi.fn(async (oauth: string) => `bearer-for:${oauth}`),
    }));
    vi.doMock('@/shared/lib/logger', () => ({
      log: { info: vi.fn(), error: vi.fn() },
    }));
    vi.doMock('@/shared/lib/mask-token', () => ({
      maskToken: vi.fn((t: string) => `masked-${t}`),
    }));

    const { ensureInternalToken } = await import('./ensure-internal-token');
    const res = await ensureInternalToken(makeEvent('Bearer sk-linked'));
    expect(res).toEqual({ bearerToken: 'bearer-for:oauth-linked' });
  });

  it('round-robins tokens for global API key', async () => {
    vi.resetModules();
    vi.doMock('@/entities/apikey/api/apikey-storage', () => ({
      getApiKeys: vi.fn(async () => [{ id: 'k1' }]),
      getApiKeyByKey: vi.fn(async (k: string) =>
        k === 'sk-global' ? { id: 'k1', name: 'global', key: 'sk-global', tokenId: null } : null,
      ),
    }));
    vi.doMock('@/entities/token/api/token-storage', () => ({
      getSelectedToken: vi.fn(async () => null),
      getTokens: vi.fn(async () => [
        { id: 't1', name: 'a', token: 'oauth-a', createdAt: 1 },
        { id: 't2', name: 'b', token: 'oauth-b', createdAt: 1 },
      ]),
      getToken: vi.fn(async () => null),
    }));
    vi.doMock('@/entities/token/api/copilot-token-meta', () => ({
      getBearerToken: vi.fn(async (oauth: string) => `bearer-for:${oauth}`),
    }));
    vi.doMock('@/shared/lib/logger', () => ({
      log: { info: vi.fn(), error: vi.fn() },
    }));
    vi.doMock('@/shared/lib/mask-token', () => ({
      maskToken: vi.fn((t: string) => `masked-${t}`),
    }));

    const { ensureInternalToken } = await import('./ensure-internal-token');
    const r1 = await ensureInternalToken(makeEvent('Bearer sk-global'));
    const r2 = await ensureInternalToken(makeEvent('Bearer sk-global'));
    expect([r1.bearerToken, r2.bearerToken]).toEqual(['bearer-for:oauth-a', 'bearer-for:oauth-b']);
  });
});
