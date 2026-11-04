import { describe, it, expect } from 'bun:test';
import { app } from '../index';

describe('Native API Response Compression', () => {
  it('does NOT compress small payloads (<1KB) even if gzip is accepted', async () => {
    // Health check or small route
    const res = await app.handle(
      new Request('http://localhost/api/health', {
        headers: {
          'Accept-Encoding': 'gzip, deflate, br',
        },
      })
    );

    expect(res.status).toBe(200);
    expect(res.headers.get('content-encoding')).toBeNull();
    const json = await res.json();
    expect(json.status).toBe('ok');
  });

  it('compresses payloads >1KB with gzip when client requests Accept-Encoding: gzip', async () => {
    // Salon catalog endpoint is large (>1KB)
    const res = await app.handle(
      new Request('http://localhost/api/salons/aura-salon', {
        headers: {
          'Accept-Encoding': 'gzip, deflate, br',
        },
      })
    );

    expect(res.status).toBe(200);
    expect(res.headers.get('content-encoding')).toBe('gzip');
    expect(res.headers.get('vary')).toContain('Accept-Encoding');

    // Decompress and verify content
    const arrayBuffer = await res.arrayBuffer();
    const decompressedBuffer = Bun.gunzipSync(new Uint8Array(arrayBuffer));
    const jsonStr = new TextDecoder().decode(decompressedBuffer);
    const json = JSON.parse(jsonStr);

    expect(json.salon.slug).toBe('aura-salon');
    expect(json.salon.services.length).toBeGreaterThan(0);
  });

  it('serves uncompressed raw JSON when client does not support gzip', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/salons/aura-salon', {
        headers: {
          // No Accept-Encoding header
        },
      })
    );

    expect(res.status).toBe(200);
    expect(res.headers.get('content-encoding')).toBeNull();
    const json = await res.json();
    expect(json.salon.slug).toBe('aura-salon');
  });
});
