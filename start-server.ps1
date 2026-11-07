Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  SnEAKs Vault Ghana - Full-Stack Launcher" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan

$nodeCmd = Get-Command node -ErrorAction SilentlyContinue

if (-not $nodeCmd) {
    Write-Host "[!] Node.js was not detected on your system." -ForegroundColor Red
    Write-Host "Opening nodejs.org download page..." -ForegroundColor Cyan
    Start-Process "https://nodejs.org/en/download"
    Start-Process "index.html"
    Read-Host "Press Enter to exit"
    exit
}

Write-Host "[*] Node.js is detected: $(node -v)" -ForegroundColor Green

Write-Host "[*] Launching SnEAKs Backend on http://localhost:5000..." -ForegroundColor Green
Start-Process "http://localhost:5000"
node server.js

