import { describe, it, expect } from 'bun:test';
import zlib from 'node:zlib';
import { app } from '../index';

describe('Multi-Tier Adaptive Response Compression Engine', () => {
  it('does NOT compress small payloads (<1KB) even if compression is accepted', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/health', {
        headers: {
          'Accept-Encoding': 'zstd, br, gzip',
        },
      })
    );

    expect(res.status).toBe(200);
    expect(res.headers.get('content-encoding')).toBeNull();
    const json = await res.json();
    expect(json.status).toBe('ok');
  });

  it('compresses payloads >1KB with Brotli (br) when client supports Brotli', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/salons/ramesh-barber', {
        headers: {
          'Accept-Encoding': 'gzip, deflate, br',
        },
      })
    );

    expect(res.status).toBe(200);
    expect(res.headers.get('content-encoding')).toBe('br');
    expect(res.headers.get('vary')).toContain('Accept-Encoding');

    // Decompress with Brotli and verify content integrity
    const arrayBuffer = await res.arrayBuffer();
    const decompressedBuffer = zlib.brotliDecompressSync(Buffer.from(arrayBuffer));
    const jsonStr = new TextDecoder().decode(decompressedBuffer);
    const json = JSON.parse(jsonStr);

    expect(json.salon.slug).toBe('ramesh-barber');
    expect(json.salon.services.length).toBeGreaterThan(0);
  });

  it('falls back to Gzip when client only requests gzip (no Brotli)', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/salons/ramesh-barber', {
        headers: {
          'Accept-Encoding': 'gzip',
        },
      })
    );

    expect(res.status).toBe(200);
    expect(res.headers.get('content-encoding')).toBe('gzip');
    expect(res.headers.get('vary')).toContain('Accept-Encoding');

    // Decompress with gunzip and verify content
    const arrayBuffer = await res.arrayBuffer();
    const bunGunzip = (globalThis as any).Bun?.gunzipSync || zlib.gunzipSync;
    const decompressedBuffer = bunGunzip(new Uint8Array(arrayBuffer));
    const jsonStr = new TextDecoder().decode(decompressedBuffer);
    const json = JSON.parse(jsonStr);

    expect(json.salon.slug).toBe('ramesh-barber');
  });

  it('serves uncompressed raw JSON when client does not support compression headers', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/salons/ramesh-barber', {
        headers: {
          // No Accept-Encoding header
        },
      })
    );

    expect(res.status).toBe(200);
    expect(res.headers.get('content-encoding')).toBeNull();
    const json = await res.json();
    expect(json.salon.slug).toBe('ramesh-barber');
  });

  it('provides Admin Compression status, capabilities detection and live benchmarks', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/admin/compression')
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.capabilities)).toBe(true);
    expect(body.settings.enabled).toBe(true);
    expect(body.settings.priority).toContain('br');
    expect(body.settings.priority).toContain('gzip');
    expect(Array.isArray(body.benchmark)).toBe(true);

    const brBenchmark = body.benchmark.find((b: any) => b.algorithm.includes('Brotli'));
    expect(brBenchmark).toBeDefined();
    expect(brBenchmark.reductionPercentage).toBeGreaterThan(50);
  });
});
