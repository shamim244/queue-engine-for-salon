# PWA Emergency Rollback Runbook

This document details the multi-layer rollback architecture established before PWA rollout.

## 1. Git Baseline Points
- **Git Tag:** `pre-pwa-baseline` (pointing to commit `c7561b3`, where Multi-Tier Compression and Admin navigation are 100% verified).
- **Git Branch:** `backup/pre-pwa` (independent backup branch).

## 2. 1-Command Emergency Rollback Scripts
- **Windows PowerShell:**
  ```powershell
  .\scripts\rollback-pwa.ps1
  ```
- **Linux / Bash:**
  ```bash
  chmod +x ./scripts/rollback-pwa.sh
  ./scripts/rollback-pwa.sh
  ```

## 3. Client-Side Service Worker Kill-Switch (`apps/web/public/sw-kill.js`)
If client smartphones (Android Chrome) ever have stale service workers:
1. Replace `apps/web/public/sw.js` with `apps/web/public/sw-kill.js`.
2. When client devices check for updates, the kill-switch triggers:
   - Immediate unregistration of `ServiceWorkerRegistration`.
   - Complete purging of all `caches.keys()`.
   - Forces client reload to raw network HTML/JS with zero cache poisoning.
