/**
 * @jest-environment node
 */

/**
 * Tests for src/lib/cronAuth.ts
 * Covers: timing-safe CRON_SECRET verification
 */

import { verifyCronSecret } from '@/lib/cronAuth';

describe('verifyCronSecret', () => {
  const originalEnv = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.CRON_SECRET = 'test-cron-secret-value';
  });

  afterAll(() => {
    process.env.CRON_SECRET = originalEnv;
  });

  it('should return null (authorized) for valid Bearer token', () => {
    const result = verifyCronSecret('Bearer test-cron-secret-value');
    expect(result).toBeNull();
  });

  it('should return 401 for invalid Bearer token', async () => {
    const result = verifyCronSecret('Bearer wrong-secret');
    expect(result).not.toBeNull();
    const body = await result!.json();
    expect(result!.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('should return 401 for missing auth header', async () => {
    const result = verifyCronSecret(null);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
  });

  it('should return 401 for empty auth header', async () => {
    const result = verifyCronSecret('');
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
  });

  it('should return 401 when CRON_SECRET env var is not set', async () => {
    delete process.env.CRON_SECRET;
    const result = verifyCronSecret('Bearer something');
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
  });

  it('should return 401 for token without Bearer prefix', async () => {
    const result = verifyCronSecret('test-cron-secret-value');
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
  });

  it('should return 401 for token with different length (timing-safe)', async () => {
    const result = verifyCronSecret('Bearer short');
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
  });
});
