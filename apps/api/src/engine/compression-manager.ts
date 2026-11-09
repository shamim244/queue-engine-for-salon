import zlib from 'node:zlib';

export type CompressionAlgorithm = 'zstd' | 'br' | 'gzip';

export interface CompressionCapability {
  algorithm: CompressionAlgorithm;
  label: string;
  available: boolean;
  engine: string;
  notes?: string;
  native: boolean;
}

export interface CompressionSettings {
  enabled: boolean;
  minThresholdBytes: number; // default 1024
  priority: CompressionAlgorithm[]; // default ['zstd', 'br', 'gzip']
  brotli: { enabled: boolean; quality: number }; // quality: 1-11, default 4
  gzip: { enabled: boolean; level: number }; // level: 1-9, default 6
  zstd: { enabled: boolean };
}

export interface CompressionResult {
  data: Uint8Array | Buffer;
  encoding: CompressionAlgorithm | null;
  originalBytes: number;
  compressedBytes: number;
  reductionPercentage: number;
}

export interface BenchmarkItem {
  algorithm: string;
  status: 'SUPPORTED' | 'NOT_INSTALLED' | 'DISABLED';
  originalBytes: number;
  compressedBytes: number;
  reductionPercentage: number;
  durationMs: number;
}

export const defaultCompressionSettings: CompressionSettings = {
  enabled: true,
  minThresholdBytes: 1024,
  priority: ['zstd', 'br', 'gzip'],
  brotli: { enabled: true, quality: 4 },
  gzip: { enabled: true, level: 6 },
  zstd: { enabled: false }, // Enabled automatically if zstd driver detected
};

class CompressionManager {
  private settings: CompressionSettings = { ...defaultCompressionSettings };
  private zstdEngine: any = null;
  private zstdChecked = false;

  constructor() {
    this.checkZstdAvailability();
  }

  private checkZstdAvailability() {
    if (this.zstdChecked) return;
    this.zstdChecked = true;
    try {
      // 1. Check for native @mongodb-js/zstd
      const zstd = require('@mongodb-js/zstd');
      if (zstd && typeof zstd.compressSync === 'function') {
        this.zstdEngine = zstd;
        this.settings.zstd.enabled = true;
        return;
      }
    } catch {
      // Fall through to WASM zstd-codec
    }

    try {
      // 2. Check for universal WebAssembly zstd-codec (works on Bun Windows/Linux/macOS)
      const { ZstdCodec } = require('zstd-codec');
      if (ZstdCodec && typeof ZstdCodec.run === 'function') {
        ZstdCodec.run((zstdInstance: any) => {
          const simple = new zstdInstance.Simple();
          this.zstdEngine = {
            compressSync: (buf: Buffer | Uint8Array) => {
              const res = simple.compress(buf);
              return Buffer.from(res.buffer, res.byteOffset, res.byteLength);
            },
            decompressSync: (buf: Buffer | Uint8Array) => {
              const res = simple.decompress(buf);
              return Buffer.from(res.buffer, res.byteOffset, res.byteLength);
            },
          };
          this.settings.zstd.enabled = true;
        });
      }
    } catch {
      this.zstdEngine = null;
    }
  }

  public getSettings(): CompressionSettings {
    return JSON.parse(JSON.stringify(this.settings));
  }

  public updateSettings(partial: Partial<CompressionSettings>): CompressionSettings {
    if (typeof partial.enabled === 'boolean') {
      this.settings.enabled = partial.enabled;
    }
    if (typeof partial.minThresholdBytes === 'number') {
      this.settings.minThresholdBytes = Math.max(128, partial.minThresholdBytes);
    }
    if (Array.isArray(partial.priority)) {
      this.settings.priority = partial.priority;
    }
    if (partial.brotli) {
      this.settings.brotli = { ...this.settings.brotli, ...partial.brotli };
    }
    if (partial.gzip) {
      this.settings.gzip = { ...this.settings.gzip, ...partial.gzip };
    }
    if (partial.zstd) {
      this.settings.zstd = { ...this.settings.zstd, ...partial.zstd };
    }
    return this.getSettings();
  }

  public getCapabilities(): CompressionCapability[] {
    this.checkZstdAvailability();

    const brotliAvailable = typeof zlib.brotliCompressSync === 'function';
    const gzipAvailable = typeof (globalThis as any).Bun?.gzipSync === 'function' || typeof zlib.gzipSync === 'function';
    const zstdAvailable = !!this.zstdEngine;

    return [
      {
        algorithm: 'zstd',
        label: 'Zstandard (zstd)',
        available: zstdAvailable,
        engine: zstdAvailable ? 'Active (WASM Zstandard Driver)' : 'Not installed in host runtime',
        notes: zstdAvailable
          ? 'Ultra-fast decompression and high compression ratio'
          : 'Server lacks native zstd binary binding. Cascades automatically to Brotli.',
        native: zstdAvailable,
      },
      {
        algorithm: 'br',
        label: 'Brotli (br)',
        available: brotliAvailable,
        engine: 'Node / Bun Native (node:zlib)',
        notes: '20%-35% smaller than Gzip for web JSON payloads. Supported by 99%+ of Android browsers.',
        native: true,
      },
      {
        algorithm: 'gzip',
        label: 'Gzip (gzip)',
        available: gzipAvailable,
        engine: 'Bun.gzipSync / node:zlib',
        notes: 'Universal standard fallback supported by every HTTP client and legacy network.',
        native: true,
      },
    ];
  }

  /**
   * Cascading Zero-Error Fallback Compression
   * Order: zstd -> br -> gzip -> raw
   */
  public compressWithFallback(
    input: Buffer | Uint8Array,
    acceptEncodingHeader: string = ''
  ): CompressionResult {
    const originalBytes = input.byteLength;

    if (!this.settings.enabled || originalBytes < this.settings.minThresholdBytes) {
      return {
        data: input,
        encoding: null,
        originalBytes,
        compressedBytes: originalBytes,
        reductionPercentage: 0,
      };
    }

    const header = acceptEncodingHeader.toLowerCase();
    const acceptsZstd = header.includes('zstd');
    const acceptsBr = header.includes('br');
    const acceptsGzip = header.includes('gzip');

    // Walk through priority order with cascading try/catch fallbacks
    for (const algo of this.settings.priority) {
      if (algo === 'zstd' && acceptsZstd && this.settings.zstd.enabled && this.zstdEngine) {
        try {
          const compressed = this.zstdEngine.compressSync(input);
          if (compressed && compressed.byteLength > 0) {
            return {
              data: compressed,
              encoding: 'zstd',
              originalBytes,
              compressedBytes: compressed.byteLength,
              reductionPercentage: Math.round(((originalBytes - compressed.byteLength) / originalBytes) * 100),
            };
          }
        } catch {
          // Cascade cleanly to next algorithm
        }
      }

      if (algo === 'br' && acceptsBr && this.settings.brotli.enabled) {
        try {
          const quality = this.settings.brotli.quality || 4;
          const compressed = zlib.brotliCompressSync(input, {
            params: {
              [zlib.constants.BROTLI_PARAM_QUALITY]: quality,
            },
          });
          if (compressed && compressed.byteLength > 0) {
            return {
              data: compressed,
              encoding: 'br',
              originalBytes,
              compressedBytes: compressed.byteLength,
              reductionPercentage: Math.round(((originalBytes - compressed.byteLength) / originalBytes) * 100),
            };
          }
        } catch {
          // Cascade cleanly to next algorithm
        }
      }

      if (algo === 'gzip' && acceptsGzip && this.settings.gzip.enabled) {
        try {
          const bunGzip = (globalThis as any).Bun?.gzipSync;
          const compressed = bunGzip
            ? bunGzip(input)
            : zlib.gzipSync(input, { level: this.settings.gzip.level || 6 });
          if (compressed && compressed.byteLength > 0) {
            return {
              data: compressed,
              encoding: 'gzip',
              originalBytes,
              compressedBytes: compressed.byteLength,
              reductionPercentage: Math.round(((originalBytes - compressed.byteLength) / originalBytes) * 100),
            };
          }
        } catch {
          // Cascade cleanly to raw fallback
        }
      }
    }

    // Final Zero-Error Fallback: uncompressed raw payload
    return {
      data: input,
      encoding: null,
      originalBytes,
      compressedBytes: originalBytes,
      reductionPercentage: 0,
    };
  }

  /**
   * Run real-time benchmark comparing raw, gzip, brotli and zstd
   */
  public runBenchmark(samplePayload?: string): BenchmarkItem[] {
    const payload =
      samplePayload ||
      JSON.stringify({
        salon: {
          id: 'salon-demo',
          name: 'Royal Heritage Lounge & Salon',
          slug: 'royal-heritage',
          operatingMode: 'MULTI_STYLIST',
          phone: '+91 98765 43210',
          currency: 'INR',
        },
        services: Array.from({ length: 15 }, (_, i) => ({
          id: `srv-${i}`,
          name: `Premium Service Tier ${i + 1}`,
          basePrice: 150 + i * 50,
          estimatedDurationMinutes: 20 + i * 5,
        })),
        activeQueue: Array.from({ length: 40 }, (_, i) => ({
          id: `tkt-${i}`,
          ticketNumber: 101 + i,
          customerName: `Valued Customer ${i + 1}`,
          customerPhone: `+91 98000 000${String(i).padStart(2, '0')}`,
          serviceName: 'Haircut & Styling + Beard Trim',
          totalPrice: 260,
          status: i === 0 ? 'IN_CHAIR' : i === 1 ? 'SUMMONED' : 'WAITING',
          estimatedWaitMinutes: i * 15,
          checkInTime: new Date(Date.now() - i * 600000).toISOString(),
        })),
      });

    const buffer = Buffer.from(payload, 'utf-8');
    const originalBytes = buffer.byteLength;
    const results: BenchmarkItem[] = [];

    // 1. Zstandard benchmark
    if (this.zstdEngine) {
      const start = performance.now();
      try {
        const compressed = this.zstdEngine.compressSync(buffer);
        const durationMs = Number((performance.now() - start).toFixed(2));
        results.push({
          algorithm: 'Zstandard (zstd)',
          status: 'SUPPORTED',
          originalBytes,
          compressedBytes: compressed.byteLength,
          reductionPercentage: Math.round(((originalBytes - compressed.byteLength) / originalBytes) * 100),
          durationMs,
        });
      } catch {
        results.push({
          algorithm: 'Zstandard (zstd)',
          status: 'DISABLED',
          originalBytes,
          compressedBytes: originalBytes,
          reductionPercentage: 0,
          durationMs: 0,
        });
      }
    } else {
      results.push({
        algorithm: 'Zstandard (zstd)',
        status: 'NOT_INSTALLED',
        originalBytes,
        compressedBytes: originalBytes,
        reductionPercentage: 0,
        durationMs: 0,
      });
    }

    // 2. Brotli benchmark
    const brStart = performance.now();
    try {
      const brCompressed = zlib.brotliCompressSync(buffer, {
        params: {
          [zlib.constants.BROTLI_PARAM_QUALITY]: 4,
        },
      });
      const brDuration = Number((performance.now() - brStart).toFixed(2));
      results.push({
        algorithm: 'Brotli (br)',
        status: 'SUPPORTED',
        originalBytes,
        compressedBytes: brCompressed.byteLength,
        reductionPercentage: Math.round(((originalBytes - brCompressed.byteLength) / originalBytes) * 100),
        durationMs: brDuration,
      });
    } catch {
      results.push({
        algorithm: 'Brotli (br)',
        status: 'DISABLED',
        originalBytes,
        compressedBytes: originalBytes,
        reductionPercentage: 0,
        durationMs: 0,
      });
    }

    // 3. Gzip benchmark
    const gzStart = performance.now();
    try {
      const bunGzip = (globalThis as any).Bun?.gzipSync;
      const gzCompressed = bunGzip ? bunGzip(buffer) : zlib.gzipSync(buffer);
      const gzDuration = Number((performance.now() - gzStart).toFixed(2));
      results.push({
        algorithm: 'Gzip (gzip)',
        status: 'SUPPORTED',
        originalBytes,
        compressedBytes: gzCompressed.byteLength,
        reductionPercentage: Math.round(((originalBytes - gzCompressed.byteLength) / originalBytes) * 100),
        durationMs: gzDuration,
      });
    } catch {
      results.push({
        algorithm: 'Gzip (gzip)',
        status: 'DISABLED',
        originalBytes,
        compressedBytes: originalBytes,
        reductionPercentage: 0,
        durationMs: 0,
      });
    }

    // 4. Raw benchmark
    results.push({
      algorithm: 'Raw (uncompressed)',
      status: 'SUPPORTED',
      originalBytes,
      compressedBytes: originalBytes,
      reductionPercentage: 0,
      durationMs: 0.01,
    });

    return results;
  }
}

export const compressionManager = new CompressionManager();
