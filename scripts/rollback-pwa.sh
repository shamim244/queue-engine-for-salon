#!/usr/bin/env bash
set -e

echo "================================================="
echo " 🛡️ PWA EMERGENCY ROLLBACK SYSTEM (ENGINE QUE)"
echo "================================================="

echo "[1/4] Checking current branch and status..."
git status --porcelain

echo "[2/4] Resetting codebase to verified baseline: pre-pwa-baseline..."
git checkout pre-pwa-baseline

echo "[3/4] Purging .next build cache..."
rm -rf apps/web/.next

echo "[4/4] Running regression tests..."
bun test apps/api/test/compression.test.ts

echo ""
echo "✅ ROLLBACK COMPLETE! Codebase successfully restored to pre-PWA state."
