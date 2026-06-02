@echo off
title Studio AI — Dev Server
color 0A

echo.
echo  ==========================================
echo    Studio AI — Starting Dev Servers...
echo  ==========================================
echo.

:: ── Start FastAPI backend ──
echo  [1/2] Starting FastAPI backend on http://127.0.0.1:8000
start "Studio AI — Backend" cmd /k "cd /d %~dp0 && venv\Scripts\activate && uvicorn main:app --reload --host 127.0.0.1 --port 8000"

:: Small delay so backend gets a head start
timeout /t 3 /nobreak >nul

:: ── Start React frontend ──
echo  [2/2] Starting React frontend on http://localhost:5173
start "Studio AI — Frontend" cmd /k "cd /d %~dp0karaoke-frontend && npm run dev"

echo.
echo  ==========================================
echo    Both servers are running!
echo    Backend  ->  http://127.0.0.1:8000
echo    Frontend ->  http://localhost:5173
echo  ==========================================
echo.
echo  Close the two terminal windows to stop the servers.
echo.
pause