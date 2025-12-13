# Akıllı Yaya Güvenliği Sistemi - Başlatma Scripti
# Backend ve Frontend'i aynı anda başlatır

Write-Host "🚀 Akıllı Yaya Güvenliği Sistemi Başlatılıyor..." -ForegroundColor Cyan
Write-Host ""

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

# Port kontrolü - 8001
$port8001 = Get-NetTCPConnection -LocalPort 8001 -ErrorAction SilentlyContinue
if ($port8001) {
    Write-Host "⚠️  Port 8001 kullanımda, eski işlem sonlandırılıyor..." -ForegroundColor Yellow
    $port8001 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
    Start-Sleep -Seconds 1
}

# Port kontrolü - 5173
$port5173 = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
if ($port5173) {
    Write-Host "⚠️  Port 5173 kullanımda, eski işlem sonlandırılıyor..." -ForegroundColor Yellow
    $port5173 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
    Start-Sleep -Seconds 1
}

# Virtual environment kontrolü
$venvPath = Join-Path $projectRoot ".venv\Scripts\Activate.ps1"
if (Test-Path $venvPath) {
    Write-Host "✅ Virtual environment bulundu" -ForegroundColor Green
} else {
    Write-Host "⚠️  Virtual environment bulunamadı. Lütfen önce oluşturun:" -ForegroundColor Yellow
    Write-Host "   python -m venv .venv" -ForegroundColor Gray
    Write-Host "   .\.venv\Scripts\activate" -ForegroundColor Gray
    Write-Host "   pip install -r requirements.txt" -ForegroundColor Gray
}

# Backend başlat (yeni pencerede)
Write-Host ""
Write-Host "📡 Backend başlatılıyor (Port 8001)..." -ForegroundColor Blue
$backendCmd = @"
Set-Location '$projectRoot'
& '$venvPath'
Set-Location backend
Write-Host '🔧 Backend başlatılıyor...' -ForegroundColor Cyan
uvicorn app:app --host 0.0.0.0 --port 8001 --reload
"@
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd

Start-Sleep -Seconds 3

# Frontend başlat (yeni pencerede)
Write-Host "🎨 Frontend başlatılıyor (Port 5173)..." -ForegroundColor Magenta
$frontendCmd = @"
Set-Location '$projectRoot\frontend'
Write-Host '🎨 Frontend başlatılıyor...' -ForegroundColor Cyan
npm run dev
"@
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host "✅ Sistem Başlatıldı!" -ForegroundColor Green
Write-Host ""
Write-Host "📡 Backend API:  http://localhost:8001" -ForegroundColor Blue
Write-Host "📚 API Docs:     http://localhost:8001/docs" -ForegroundColor Blue
Write-Host "🎨 Frontend:     http://localhost:5173" -ForegroundColor Magenta
Write-Host ""
Write-Host "💡 Durdurmak için açılan terminal pencerelerini kapatın" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor DarkGray

# Tarayıcıyı aç
Start-Sleep -Seconds 2
Start-Process "http://localhost:5173"
