@echo off
title Akilli Su Filtrasyon - Simulatorsuz Baslat
echo ====================================================================
echo Akilli Su Filtrasyon ve Erken Uyari Sistemi
echo Backend + Frontend baslatiliyor (Simulatorsuz)
echo (Servisleri durdurmak icin acilan konsol pencerelerini kapatabilirsiniz)
echo ====================================================================

cd /d "%~dp0"

echo.
echo [1/2] Backend (NestJS - Port 3000) baslatiliyor...
start "Filtration Backend" /D "%~dp0filtration-backend" cmd /k "npm run start:dev"

echo.
echo [2/2] Frontend (React Vite - Port 5173) baslatiliyor...
start "Filtration Frontend" /D "%~dp0filtration-frontend" cmd /k "npm run dev"

echo.
echo Backend servisinin hazir olmasi bekleniyor...
set /a RETRY=0
:wait_backend
curl.exe -sf --connect-timeout 1 http://localhost:3000/api/sensor/health >nul 2>&1
if %errorlevel%==0 goto backend_ready
set /a RETRY+=1
if %RETRY% GEQ 20 (
    echo [UYARI] Backend henuz yanit vermedi, tarayici yine de aciliyor...
    goto backend_ready
)
timeout /t 2 /nobreak >nul
goto wait_backend

:backend_ready
echo.
echo Tarayici aciliyor: http://localhost:5173
start "" "http://localhost:5173"

echo.
echo ====================================================================
echo Servisler baslatildi.
echo - Backend API : http://localhost:3000
echo - Web Paneli  : http://localhost:5173
echo - Simulator   : Calistirilmadi (gercek ESP32 sensor icin)
echo ====================================================================
pause
