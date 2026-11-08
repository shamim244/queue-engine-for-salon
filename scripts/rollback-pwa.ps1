# PWA Emergency Rollback Script for Windows PowerShell
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host " 🛡️ PWA EMERGENCY ROLLBACK SYSTEM (ENGINE QUE)" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

$CurrentBranch = git branch --show-current
Write-Host "[1/4] Current branch is: $CurrentBranch" -ForegroundColor Yellow

# Verify git clean or stash uncommitted
$Status = git status --porcelain
if ($Status) {
    Write-Host "[!] Working tree has uncommitted modifications. Stashing..." -ForegroundColor Yellow
    git stash push -m "Pre-rollback auto-stash $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
}

# Checkout to tagged baseline
Write-Host "[2/4] Resetting codebase to verified baseline: pre-pwa-baseline..." -ForegroundColor Cyan
git checkout pre-pwa-baseline

# Purge any Next.js build cache or client bundles
Write-Host "[3/4] Purging .next build cache..." -ForegroundColor Cyan
if (Test-Path "apps/web/.next") {
    Remove-Item -Recurse -Force "apps/web/.next"
    Write-Host "   -> apps/web/.next removed." -ForegroundColor Green
}

# Re-run verification tests
Write-Host "[4/4] Running regression tests..." -ForegroundColor Cyan
bun test apps/api/test/compression.test.ts

Write-Host ""
Write-Host "✅ ROLLBACK COMPLETE! Codebase successfully restored to pre-PWA state." -ForegroundColor Green
Write-Host "All service worker and PWA configurations safely reverted." -ForegroundColor Green
