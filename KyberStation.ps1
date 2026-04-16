$Host.UI.RawUI.WindowTitle = "KyberStation"
Set-Location "Z:\Development\KyberStation"

Write-Host ""
Write-Host "  ========================================" -ForegroundColor Cyan
Write-Host "   KyberStation - Blade Style Editor" -ForegroundColor White
Write-Host "  ========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Starting production server with HTTPS..." -ForegroundColor Gray
Write-Host ""

# Open browser after delay
Start-Job -ScriptBlock { Start-Sleep 8; Start-Process "https://localhost:3443" } | Out-Null

# Run the server
node scripts\local-serve.mjs

Write-Host ""
Write-Host "  Server stopped." -ForegroundColor Yellow
Read-Host "  Press Enter to close"
