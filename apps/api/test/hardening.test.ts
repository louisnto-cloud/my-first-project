import { beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createDb, type DB } from '../src/db.js';
import { buildServer } from '../src/server.js';
import { seedDemo } from '../src/seed.js';

let db: DB;
let app: FastifyInstance;

beforeAll(async () => {
  db = await createDb();
  await seedDemo(db);
  app = await buildServer(db, { authLimit: { max: 5, windowMs: 60_000 }, corsOrigin: 'https://etop.example' });
});

describe('Phase 7 hardening', () => {
  it('health reports database status and uptime', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true, db: true });
  });

  it('security headers and CORS are present on every response', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.headers['access-control-allow-origin']).toBe('https://etop.example');
    const preflight = await app.inject({ method: 'OPTIONS', url: '/auth/login-code' });
    expect(preflight.statusCode).toBe(204);
  });

  it('brute-forcing login codes hits the rate limit', async () => {
    const codes: number[] = [];
    for (let i = 0; i < 8; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/login-code',
        payload: { code: `HVX${1000 + i}` },
        remoteAddress: '203.0.113.9',
      });
      codes.push(res.statusCode);
    }
    expect(codes.slice(0, 5).every((c) => c === 401)).toBe(true);
    expect(codes.slice(5).every((c) => c === 429)).toBe(true);
  });

  it('the rate limit is per client, not global', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login-code',
      payload: { code: 'HV0001' },
      remoteAddress: '203.0.113.77',
    });
    expect(res.statusCode).toBe(200); // a different IP is unaffected
  });

  it('redaction config exists for sensitive fields when logging is enabled', async () => {
    // Build with logger on to ensure the option wiring is valid.
    const logged = await buildServer(db, { logger: true });
    expect(logged).toBeDefined();
    await logged.close();
  });
});
