@echo off
title BladeForge
cd /d "Z:\Development\SaberSpanner"

REM Open browser after a short delay
start "" cmd /c "timeout /t 6 /nobreak >nul && start https://localhost:3443"

REM Start production server with HTTPS
node scripts\local-serve.mjs
pause
