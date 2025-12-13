@echo off
title Akilli Yaya Guvenligi Sistemi
echo.
echo ========================================
echo   Akilli Yaya Guvenligi Sistemi
echo ========================================
echo.

cd /d "%~dp0"

echo [1/2] Backend baslatiliyor (Port 8001)...
start "Backend - Akilli Yaya" cmd /k "cd backend && ..\.venv\Scripts\activate && uvicorn app:app --host 0.0.0.0 --port 8001 --reload"

timeout /t 3 /nobreak > nul

echo [2/2] Frontend baslatiliyor (Port 5173)...
start "Frontend - Akilli Yaya" cmd /k "cd frontend && npm run dev"

timeout /t 3 /nobreak > nul

echo.
echo ========================================
echo   Sistem Baslatildi!
echo ========================================
echo.
echo   Backend:  http://localhost:8001
echo   Frontend: http://localhost:5173
echo.
echo   Tarayici aciliyor...
echo ========================================

start http://localhost:5173

echo.
echo Bu pencereyi kapatabilirsiniz.
pause
