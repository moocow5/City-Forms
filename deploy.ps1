Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ProjectRoot = "C:\Scripts\City Forms"
$AppName     = "city-forms"

Write-Host ""
Write-Host "=== City Forms Deploy ===" -ForegroundColor Cyan
Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host ""

Set-Location $ProjectRoot

# 1. Pull
Write-Host "[1/3] git pull..." -ForegroundColor Yellow
$gitOut = git pull 2>&1
if ($LASTEXITCODE -ne 0) { Write-Host $gitOut; exit 1 }
Write-Host $gitOut

# 2. npm ci if package files changed
Write-Host ""
if ($gitOut | Select-String "package") {
    Write-Host "[2/3] Dependencies changed — running npm ci..." -ForegroundColor Yellow
    npm ci --omit=dev
    if ($LASTEXITCODE -ne 0) { exit 1 }
    Write-Host "  Done." -ForegroundColor Green
} else {
    Write-Host "[2/3] No dependency changes — skipping npm ci." -ForegroundColor Green
}

# 3. Zero-downtime reload (starts new process before killing old — no port gap)
Write-Host ""
Write-Host "[3/3] Reloading via PM2..." -ForegroundColor Yellow
pm2 reload $AppName --update-env
if ($LASTEXITCODE -ne 0) {
    Write-Host "Reload failed. Check logs: pm2 logs $AppName --lines 50" -ForegroundColor Red
    exit 1
}

pm2 save | Out-Null

Write-Host ""
Write-Host "=== Deploy complete ===" -ForegroundColor Green
Write-Host ""
pm2 show $AppName
