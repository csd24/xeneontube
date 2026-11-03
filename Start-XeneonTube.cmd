@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 24.5 or later, then run this launcher again.
  pause
  exit /b 1
)
if not exist .env (
  copy .env.example .env >nul
  echo Created .env. Add your YouTube Data API key, save the file, and run this launcher again.
  notepad .env
  exit /b 1
)
echo Keep this window open while using the iCUE widget.
call npm start
if errorlevel 1 pause
