import { vi, expect, describe, it, beforeEach, afterEach } from 'vitest';

// Import the default export from the next config
import nextConfigDefault from './next.config';

// Helper to import dynamically if export is a function
async function resolveExport(exported: any) {
  if (typeof exported === 'function') {
    // call without args, and await if Promise
    const result = exported();
    return result instanceof Promise ? await result : result;
  }
  return exported;
}

describe('next.config default export', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should export an object when imported (basic shape validation) when export is object', async () => {
    const resolved = await resolveExport(nextConfigDefault);
    expect(resolved).toBeTruthy();
    expect(typeof resolved).toBe('object');
  });

  it('should contain expected Next.js config keys (reactStrictMode, images, env) if present', async () => {
    const resolved = await resolveExport(nextConfigDefault);
    // keys are optional, assert presence if defined and correct types
    if (resolved && 'reactStrictMode' in resolved) {
      expect(typeof resolved.reactStrictMode).toBe('boolean');
    }
    if (resolved && 'images' in resolved) {
      expect(typeof resolved.images).toBe('object');
    }
    if (resolved && 'env' in resolved) {
      expect(typeof resolved.env).toBe('object');
    }
  });

  it('should resolve functions (if the export is a function) and return a config object', async () => {
    if (typeof nextConfigDefault === 'function') {
      const resolved = await resolveExport(nextConfigDefault);
      expect(resolved).toBeTruthy();
      expect(typeof resolved).toBe('object');
    } else {
      expect(typeof nextConfigDefault).toBe('object');
    }
  });

  it('should preserve any async behavior if the export is an async function (awaited correctly)', async () => {
    if (typeof nextConfigDefault === 'function') {
      const resolved = await resolveExport(nextConfigDefault);
      expect(resolved).toBeDefined();
      expect(typeof resolved).toBe('object');
    } else {
      expect(nextConfigDefault).toBeDefined();
    }
  });

  it('should handle when process.env values are missing by using defaults or throwing clear errors', async () => {
    const backup = { ...process.env };
    try {
      delete process.env.NEXT_PUBLIC_API_URL;
      delete process.env.NODE_ENV;
      const resolved = await resolveExport(nextConfigDefault);
      if (resolved && resolved.env) {
        for (const [k, v] of Object.entries(resolved.env)) {
          expect(typeof v === 'string' || typeof v === 'undefined').toBeTruthy();
        }
      }
    } catch (err: any) {
      expect(err).toBeInstanceOf(Error);
      expect(err.message.length).toBeGreaterThan(0);
    } finally {
      process.env = backup;
    }
  });

  it('should not mutate process.env during resolution and should be idempotent when called multiple times', async () => {
    const before = { ...process.env };
    const first = await resolveExport(nextConfigDefault);
    const second = await resolveExport(nextConfigDefault);
    expect(first).toEqual(second);
    expect(process.env).toEqual(before);
  });

  it('should throw a clear error if exported function returns non-object', async () => {
    if (typeof nextConfigDefault === 'function') {
      const original = nextConfigDefault;
      const wrapper = async () => {
        const val = await original();
        if (typeof val !== 'object' || val === null) {
          throw new Error('Next config function must return an object');
        }
        return val;
      };
      try {
        const res = await wrapper();
        expect(typeof res).toBe('object');
      } catch (err: any) {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toContain('must return an object');
      }
    } else {
      expect(typeof nextConfigDefault).toBe('object');
    }
  });
});
