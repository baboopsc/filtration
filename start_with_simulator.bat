@echo off
title Akilli Su Filtrasyon - Simulatorlu Baslat
echo ====================================================================
echo Akilli Su Filtrasyon ve Erken Uyari Sistemi
echo Backend + Frontend + Sensor Simulatoru baslatiliyor
echo (Servisleri durdurmak icin acilan konsol pencerelerini kapatabilirsiniz)
echo ====================================================================

cd /d "%~dp0"

echo.
echo [1/3] Backend (NestJS - Port 3000) baslatiliyor...
start "Filtration Backend" /D "%~dp0filtration-backend" cmd /k "npm run start:dev"

echo.
echo [2/3] Frontend (React Vite - Port 5173) baslatiliyor...
start "Filtration Frontend" /D "%~dp0filtration-frontend" cmd /k "npm run dev"

echo.
echo Backend servisinin hazir olmasi bekleniyor...
set /a RETRY=0
:wait_backend
curl.exe -sf --connect-timeout 1 http://localhost:3000/api/sensor/health >nul 2>&1
if %errorlevel%==0 goto backend_ready
set /a RETRY+=1
if %RETRY% GEQ 20 (
    echo [UYARI] Backend henuz yanit vermedi, simulator yine de baslatiliyor...
    goto backend_ready
)
timeout /t 2 /nobreak >nul
goto wait_backend

:backend_ready
echo [HAZIR] Backend servisi aktif!
echo.
echo [3/3] Sensor Simulatoru (sensor-bot.py) baslatiliyor...
start "Sensor Simulatoru" /D "%~dp0" cmd /k "python sensor-bot.py"

echo.
echo Tarayici aciliyor: http://localhost:5173
start "" "http://localhost:5173"

echo.
echo ====================================================================
echo Tum servisler baslatildi.
echo - Backend API : http://localhost:3000
echo - Web Paneli  : http://localhost:5173
echo - Simulator   : Canli veri akisi aktif
echo ====================================================================
pause
