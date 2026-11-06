"use client";

import React, { Suspense, useState, useEffect } from "react";
import { SettingsNav } from "@/components/admin/settings-nav";
import { api } from "@/lib/api";
import type { PlatformSettings } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Cpu,
  Radio,
  Send,
  CheckCircle2,
  AlertCircle,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  Database,
  Server,
  Activity,
  MessageSquare,
  ShieldAlert,
} from "lucide-react";

interface SystemFormState {
  heartbeatIntervalSeconds: number;
  watchdogTimeoutSeconds: number;
  autoSummonThresholdSeconds: number;
  ticketRetentionHours: number;
  provider: string;
  senderPhone: string;
  apiKey: string;
}

const defaultSystemState: SystemFormState = {
  heartbeatIntervalSeconds: 10,
  watchdogTimeoutSeconds: 3,
  autoSummonThresholdSeconds: 180,
  ticketRetentionHours: 24,
  provider: "SIMULATOR",
  senderPhone: "+91 98765 00000",
  apiKey: "env_secret_waba_test_key_xxxx",
};

function SystemSettingsContent() {
  const [form, setForm] = useState<SystemFormState>(defaultSystemState);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [showApiKey, setShowApiKey] = useState<boolean>(false);

  // Test Notification state
  const [testPhone, setTestPhone] = useState<string>("+91 98765 43210");
  const [dispatching, setDispatching] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    provider: string;
    notificationId?: string;
    timestamp?: string;
    message?: string;
  } | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadSettings() {
      try {
        const data = await api.admin.getSettings();
        if (data && isMounted) {
          setForm({
            heartbeatIntervalSeconds:
              data.engine?.heartbeatIntervalSeconds ?? defaultSystemState.heartbeatIntervalSeconds,
            watchdogTimeoutSeconds:
              data.engine?.watchdogTimeoutSeconds ?? defaultSystemState.watchdogTimeoutSeconds,
            autoSummonThresholdSeconds:
              data.engine?.autoSummonThresholdSeconds ?? defaultSystemState.autoSummonThresholdSeconds,
            ticketRetentionHours:
              data.engine?.ticketRetentionHours ?? defaultSystemState.ticketRetentionHours,
            provider: data.gateway?.provider || defaultSystemState.provider,
            senderPhone: data.gateway?.senderPhone || defaultSystemState.senderPhone,
            apiKey: defaultSystemState.apiKey,
          });
        }
      } catch (err: any) {
        console.error("Failed to fetch system settings:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const response = await api.admin.updateSettings({
        engine: {
          heartbeatIntervalSeconds: Number(form.heartbeatIntervalSeconds),
          watchdogTimeoutSeconds: Number(form.watchdogTimeoutSeconds),
          autoSummonThresholdSeconds: Number(form.autoSummonThresholdSeconds),
          ticketRetentionHours: Number(form.ticketRetentionHours),
        },
        gateway: {
          provider: form.provider,
          senderPhone: form.senderPhone,
        },
      });

      if (response && response.success) {
        setSuccessMessage("System engine telemetry & gateway configuration saved successfully.");
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        setErrorMessage("Failed to persist engine settings.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  const handleDispatchTest = async () => {
    setDispatching(true);
    setTestResult(null);
    try {
      const result = await api.admin.testNotification(
        testPhone,
        `Engine Que Gateway Test [${form.provider}]`
      );
      setTestResult(result);
    } catch (err: any) {
      setTestResult({
        success: false,
        provider: form.provider,
        message: err.message || "Failed to dispatch test alert",
      });
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">System Engine & Gateways</h1>
            <p className="text-sm text-slate-400">High-Frequency Telemetry Tuning, WebSocket Watchdogs, & Message Gateways</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <SettingsNav />

      {/* Status Alerts */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{successMessage}</span>
          <Badge variant="outline" className="ml-auto border-emerald-700 text-emerald-300 text-xs">
            Saved
          </Badge>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 flex items-center gap-3 animate-in fade-in">
          <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
          <span className="text-sm font-medium">{errorMessage}</span>
        </div>
      )}

      {/* Database & Storage Health Card */}
      <Card className="bg-slate-900/60 border-slate-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-emerald-400" />
              <CardTitle className="text-lg text-white">Database & Storage Health</CardTitle>
            </div>
            <Badge variant="default" className="bg-emerald-600 text-xs gap-1.5 py-0.5">
              <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
              Operational
            </Badge>
          </div>
          <CardDescription className="text-slate-400">
            Real-time persistence layer status, in-memory table synchronization, and active client connection pools.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 uppercase font-semibold">Persistence Engine</span>
              <Activity className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="text-base font-bold text-white">MySQL Relational DB</p>
            <p className="text-xs text-emerald-400 font-mono">ONLINE (student-fee-management-system)</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 uppercase font-semibold">In-Memory Mirror</span>
              <Server className="h-4 w-4 text-blue-400" />
            </div>
            <p className="text-base font-bold text-white">Zero-Latency State Store</p>
            <p className="text-xs text-slate-400 font-mono">Synchronized & Fallback Armed</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 uppercase font-semibold">Live WebSocket Pool</span>
              <Radio className="h-4 w-4 text-cyan-400 animate-pulse" />
            </div>
            <p className="text-base font-bold text-white">Active Connection Hub</p>
            <p className="text-xs text-cyan-400 font-mono">Port 3001/ws (Bun Native)</p>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Engine Telemetry Calibration */}
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Activity className="h-5 w-5 text-cyan-400" />
              Engine Telemetry Calibration
            </CardTitle>
            <CardDescription className="text-slate-400">
              Fine-tune the heartbeat pulse, client disconnection watchdog thresholds, and ticket lifecycle pruning.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">Heartbeat Ping Interval (seconds)</label>
              <Input
                type="number"
                min={2}
                max={60}
                value={form.heartbeatIntervalSeconds}
                onChange={(e) =>
                  setForm({ ...form, heartbeatIntervalSeconds: parseInt(e.target.value) || 10 })
                }
                className="bg-slate-950 border-slate-800 text-slate-200 font-mono"
                required
              />
              <p className="text-xs text-slate-500">
                Frequency at which server pings connected tablet kiosks and TVs (default 10s).
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">Watchdog SLA Timeout (seconds)</label>
              <Input
                type="number"
                min={1}
                max={15}
                value={form.watchdogTimeoutSeconds}
                onChange={(e) =>
                  setForm({ ...form, watchdogTimeoutSeconds: parseInt(e.target.value) || 3 })
                }
                className="bg-slate-950 border-slate-800 text-slate-200 font-mono"
                required
              />
              <p className="text-xs text-slate-500">
                Maximum reconnection window before the system triggers an operator alert (default 3s).
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">Stale Ticket Retention Window (hours)</label>
              <Input
                type="number"
                min={1}
                max={720}
                value={form.ticketRetentionHours}
                onChange={(e) =>
                  setForm({ ...form, ticketRetentionHours: parseInt(e.target.value) || 24 })
                }
                className="bg-slate-950 border-slate-800 text-slate-200 font-mono"
                required
              />
              <p className="text-xs text-slate-500">
                Duration completed/no-show tickets remain in volatile memory before archival (default 24h).
              </p>
            </div>
          </CardContent>
        </Card>

        {/* WhatsApp & SMS Notification Gateway */}
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-emerald-400" />
              Notification Gateway
            </CardTitle>
            <CardDescription className="text-slate-400">
              Configure downstream SMS & WhatsApp delivery connectors for customer summon alerts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200">Provider</label>
                <select
                  value={form.provider}
                  onChange={(e) => setForm({ ...form, provider: e.target.value })}
                  className="w-full h-10 px-3 rounded-md bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                >
                  <option value="SIMULATOR">SIMULATOR (Native Dev Test)</option>
                  <option value="META_CLOUD_API">META_CLOUD_API (Official WhatsApp Cloud API)</option>
                  <option value="TWILIO">TWILIO (Twilio Messaging Service)</option>
                  <option value="GUPSHUP">GUPSHUP (Enterprise WhatsApp Gateway)</option>
                </select>
                <p className="text-xs text-slate-500">
                  Select SIMULATOR for offline terminal testing or META_CLOUD_API for production WABA.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200">WABA Phone Number ID / Sender Phone</label>
                <Input
                  value={form.senderPhone}
                  onChange={(e) => setForm({ ...form, senderPhone: e.target.value })}
                  placeholder="+91 98765 00000"
                  className="bg-slate-950 border-slate-800 text-slate-200 font-mono"
                  required
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-200 flex items-center justify-between">
                  <span>API Key / Access Token</span>
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    {showApiKey ? (
                      <>
                        <EyeOff className="h-3.5 w-3.5" /> Hide Token
                      </>
                    ) : (
                      <>
                        <Eye className="h-3.5 w-3.5" /> Reveal Token
                      </>
                    )}
                  </button>
                </label>
                <div className="relative">
                  <Input
                    type={showApiKey ? "text" : "password"}
                    value={form.apiKey}
                    onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                    className="bg-slate-950 border-slate-800 text-slate-200 font-mono pr-10"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Encrypted bearer token for authenticating upstream WhatsApp Business Cloud API requests.
                </p>
              </div>
            </div>

            {/* Test Notification Dispatcher */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-4">
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4 text-blue-400" />
                <h4 className="text-sm font-semibold text-slate-200">Live Gateway Test Pipeline</h4>
              </div>
              <p className="text-xs text-slate-400">
                Trigger a diagnostic test dispatch to verify that message templates and credentials pass upstream validation.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                <Input
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="bg-slate-900 border-slate-800 text-slate-200 font-mono max-w-sm"
                />
                <Button
                  type="button"
                  onClick={handleDispatchTest}
                  disabled={dispatching}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 text-xs font-semibold shrink-0"
                >
                  {dispatching ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  Dispatch Test WhatsApp Alert
                </Button>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-lg border text-xs font-mono space-y-1 ${
                    testResult.success
                      ? "bg-emerald-950/40 border-emerald-800/80 text-emerald-300"
                      : "bg-red-950/40 border-red-800/80 text-red-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold">
                      {testResult.success ? "✓ DISPATCH SUCCESSFUL" : "✗ DISPATCH FAILED"}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {testResult.provider}
                    </Badge>
                  </div>
                  {testResult.notificationId && (
                    <p className="text-slate-400">Notification ID: {testResult.notificationId}</p>
                  )}
                  {testResult.timestamp && (
                    <p className="text-slate-400">Sent At: {testResult.timestamp}</p>
                  )}
                  {testResult.message && <p className="text-slate-300">{testResult.message}</p>}
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="border-t border-slate-800/80 pt-5 flex justify-end">
            <Button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-500 text-white gap-2 font-medium"
            >
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Changes
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}

export default function SystemSettingsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading system settings...</div>}>
      <SystemSettingsContent />
    </Suspense>
  );
}
