"use client";

import React, { useState, useEffect } from "react";
import {
  api,
  getCompressionStatus,
  updateCompressionSettings,
  runCompressionBenchmark,
  request,
} from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Zap,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Save,
  Server,
  Layers,
  Activity,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

interface Capability {
  algorithm: "zstd" | "br" | "gzip";
  label: string;
  available: boolean;
  engine: string;
  notes?: string;
  native: boolean;
}

interface BenchmarkItem {
  algorithm: string;
  status: "SUPPORTED" | "NOT_INSTALLED" | "DISABLED";
  originalBytes: number;
  compressedBytes: number;
  reductionPercentage: number;
  durationMs: number;
}

interface CompressionSettings {
  enabled: boolean;
  minThresholdBytes: number;
  priority: Array<"zstd" | "br" | "gzip">;
  brotli: { enabled: boolean; quality: number };
  gzip: { enabled: boolean; level: number };
  zstd: { enabled: boolean };
}

const defaultCapabilities: Capability[] = [
  {
    algorithm: "zstd",
    label: "Zstandard (zstd)",
    available: false,
    engine: "Host Environment Detection",
    notes: "Ultra-fast decompression. If missing binary driver, cascades smoothly to Brotli.",
    native: false,
  },
  {
    algorithm: "br",
    label: "Brotli (br)",
    available: true,
    engine: "Node / Bun Native (node:zlib)",
    notes: "20%-35% more compact than Gzip for JSON text. Native on 99%+ of Android devices.",
    native: true,
  },
  {
    algorithm: "gzip",
    label: "Gzip (gzip)",
    available: true,
    engine: "Bun.gzipSync / node:zlib",
    notes: "Universal fallback standard for legacy networks and older browsers.",
    native: true,
  },
];

export function CompressionCenter() {
  const [capabilities, setCapabilities] = useState<Capability[]>(defaultCapabilities);
  const [settings, setSettings] = useState<CompressionSettings>({
    enabled: true,
    minThresholdBytes: 1024,
    priority: ["zstd", "br", "gzip"],
    brotli: { enabled: true, quality: 4 },
    gzip: { enabled: true, level: 6 },
    zstd: { enabled: false },
  });
  const [benchmark, setBenchmark] = useState<BenchmarkItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [benchmarking, setBenchmarking] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadCompressionData();
  }, []);

  const fetchCompressionStatusSafe = async () => {
    if (typeof api?.admin?.getCompressionStatus === "function") {
      return await api.admin.getCompressionStatus();
    }
    if (typeof getCompressionStatus === "function") {
      return await getCompressionStatus();
    }
    return await request<any>("/api/admin/compression");
  };

  const updateCompressionSafe = async (data: any) => {
    if (typeof api?.admin?.updateCompressionSettings === "function") {
      return await api.admin.updateCompressionSettings(data);
    }
    if (typeof updateCompressionSettings === "function") {
      return await updateCompressionSettings(data);
    }
    return await request<any>("/api/admin/compression", {
      method: "POST",
      body: JSON.stringify(data),
    });
  };

  const runBenchmarkSafe = async (payload?: string) => {
    if (typeof api?.admin?.runCompressionBenchmark === "function") {
      return await api.admin.runCompressionBenchmark(payload);
    }
    if (typeof runCompressionBenchmark === "function") {
      return await runCompressionBenchmark(payload);
    }
    return await request<any>("/api/admin/compression/benchmark", {
      method: "POST",
      body: JSON.stringify({ payload }),
    });
  };

  const loadCompressionData = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await fetchCompressionStatusSafe();
      if (res && res.success) {
        setCapabilities(res.capabilities || defaultCapabilities);
        if (res.settings) setSettings(res.settings);
        if (res.benchmark) setBenchmark(res.benchmark);
      }
    } catch (err: any) {
      console.warn("Primary compression status fetch failed, trying direct fallback:", err);
      try {
        const raw = await fetch("/api/admin/compression");
        if (raw.ok) {
          const res = await raw.json();
          if (res && res.success) {
            setCapabilities(res.capabilities || defaultCapabilities);
            if (res.settings) setSettings(res.settings);
            if (res.benchmark) setBenchmark(res.benchmark);
            return;
          }
        }
      } catch (fallbackErr: any) {
        console.error("Direct fetch fallback also failed:", fallbackErr);
      }
      setErrorMessage("Failed to load compression status: " + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setSuccessMessage(null);
      setErrorMessage(null);
      const res = await updateCompressionSafe(settings);
      if (res && res.success) {
        setSuccessMessage("Compression configuration successfully synced across platform!");
        if (res.settings) setSettings(res.settings);
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err: any) {
      setErrorMessage("Error saving compression settings: " + (err.message || String(err)));
    } finally {
      setSaving(false);
    }
  };

  const handleRunBenchmark = async () => {
    try {
      setBenchmarking(true);
      setErrorMessage(null);
      const res = await runBenchmarkSafe();
      if (res && res.success && res.benchmark) {
        setBenchmark(res.benchmark);
        setSuccessMessage("Real-time benchmark updated successfully!");
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err: any) {
      setErrorMessage("Benchmark error: " + (err.message || String(err)));
    } finally {
      setBenchmarking(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-slate-900/60 border-slate-800 p-8 text-center text-slate-400">
        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-500" />
        <span>Loading compression telemetry & capability matrix...</span>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900/60 border-slate-800 shadow-xl">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-400" />
              <span>Multi-Tier Adaptive Response Compression</span>
            </CardTitle>
            <CardDescription className="text-slate-400 mt-1">
              Zero-error cascading fallback:{" "}
              <strong className="text-sky-300">Zstandard</strong> &rarr;{" "}
              <strong className="text-emerald-300">Brotli</strong> &rarr;{" "}
              <strong className="text-indigo-300">Gzip</strong> &rarr;{" "}
              <strong className="text-slate-300">Raw</strong>
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRunBenchmark}
              disabled={benchmarking}
              className="border-slate-700 bg-slate-950 text-slate-300 hover:text-white text-xs gap-1.5"
            >
              <Activity className={`h-3.5 w-3.5 ${benchmarking ? "animate-spin text-blue-400" : "text-emerald-400"}`} />
              <span>{benchmarking ? "Benchmarking..." : "Run Live Benchmark"}</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-200 text-sm flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-200 text-sm flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Runtime Capabilities Matrix */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Server Runtime Detection & Availability
          </span>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Zstandard Card */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-sky-400" />
                  Zstandard (zstd)
                </span>
                {capabilities.find((c) => c.algorithm === "zstd")?.available ? (
                  <Badge variant="success" className="text-[10px]">Active</Badge>
                ) : (
                  <Badge variant="warning" className="text-[10px] bg-amber-500/10 text-amber-300 border-amber-500/30">
                    Not Installed (Auto-Cascade)
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {capabilities.find((c) => c.algorithm === "zstd")?.notes ||
                  "Ultra-fast decompression. If missing binary driver, cascades smoothly to Brotli."}
              </p>
              <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-xs">
                <span className="text-slate-500">Cascade Status:</span>
                <span className="text-slate-300 font-mono">1st Priority</span>
              </div>
            </div>

            {/* Brotli Card */}
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-emerald-400" />
                  Brotli (br)
                </span>
                <Badge variant="success" className="text-[10px] bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
                  Active (Native Bun)
                </Badge>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                20%-35% more compact than Gzip for JSON text. Native on 99%+ of Android devices.
              </p>
              <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-xs">
                <span className="text-slate-500">Quality Preset:</span>
                <span className="text-emerald-400 font-mono font-bold">Fast Level 4</span>
              </div>
            </div>

            {/* Gzip Card */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm flex items-center gap-1.5">
                  <Server className="h-4 w-4 text-indigo-400" />
                  Gzip (gzip)
                </span>
                <Badge variant="secondary" className="text-[10px]">
                  Active (Universal)
                </Badge>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Universal fallback standard for legacy networks, older browsers, and cURL CLI scripts.
              </p>
              <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-xs">
                <span className="text-slate-500">Safety Net:</span>
                <span className="text-slate-300 font-mono">3rd Priority</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Compression Benchmark Table */}
        {benchmark.length > 0 && (
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Live Real-World Payload Benchmark (50-Ticket Catalog Snapshot)
            </span>

            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Algorithm</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Raw Payload</th>
                    <th className="py-2.5 px-3">Over-the-Wire</th>
                    <th className="py-2.5 px-3">Bandwidth Saved</th>
                    <th className="py-2.5 px-3">Latency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {benchmark.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/40">
                      <td className="py-2.5 px-3 font-sans font-bold text-white flex items-center gap-1.5">
                        {item.algorithm.includes("Brotli") && <Zap className="h-3.5 w-3.5 text-emerald-400" />}
                        {item.algorithm.includes("Gzip") && <Server className="h-3.5 w-3.5 text-indigo-400" />}
                        {item.algorithm.includes("Zstandard") && <Layers className="h-3.5 w-3.5 text-sky-400" />}
                        {item.algorithm.includes("Raw") && <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />}
                        <span>{item.algorithm}</span>
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            item.status === "SUPPORTED"
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                              : "bg-amber-950 text-amber-300 border border-amber-800"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {(item.originalBytes / 1024).toFixed(2)} KB
                      </td>
                      <td className="py-2.5 px-3 font-bold text-white">
                        {item.compressedBytes < 1024
                          ? `${item.compressedBytes} B`
                          : `${(item.compressedBytes / 1024).toFixed(2)} KB`}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-emerald-400">
                        {item.reductionPercentage > 0 ? `-${item.reductionPercentage}%` : "0% (Raw)"}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {item.durationMs} ms
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Configuration Controls */}
        <form onSubmit={handleSave} className="space-y-4 pt-2 border-t border-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-200">
                Minimum Payload Threshold (Bytes)
              </label>
              <Input
                type="number"
                value={settings.minThresholdBytes}
                onChange={(e) =>
                  setSettings({ ...settings, minThresholdBytes: Number(e.target.value) || 1024 })
                }
                min={128}
                max={1048576}
                className="bg-slate-950 border-slate-800 text-slate-200 font-mono h-9 text-xs"
              />
              <p className="text-[11px] text-slate-500">
                Responses smaller than this (e.g. &lt;1KB) skip compression to avoid CPU overhead on tiny responses.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-200">
                Global Compression Master Switch
              </label>
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, enabled: !settings.enabled })}
                  className={`h-9 px-4 rounded-xl text-xs font-bold transition-all border ${
                    settings.enabled
                      ? "bg-emerald-600 border-emerald-500 text-white shadow-sm"
                      : "bg-slate-950 border-slate-800 text-slate-400"
                  }`}
                >
                  {settings.enabled ? "✓ Enabled (All Endpoints)" : "✕ Disabled (Raw Identity Only)"}
                </button>
                <span className="text-xs text-slate-400">
                  {settings.enabled ? "Active across all routes" : "Bypasses all compression"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs gap-1.5 h-9 font-semibold"
            >
              {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              <span>Save Compression Settings</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
