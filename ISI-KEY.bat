@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js belum terpasang. Pasang dari https://nodejs.org lalu jalankan file ini lagi.
  pause
  exit /b 1
)
node tools\set-key.mjs %1
echo.
pause
