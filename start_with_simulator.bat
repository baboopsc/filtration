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
start "Filtration Backend" cmd /k "cd /d "%~dp0filtration-backend" && npm run start:dev"

echo.
echo [2/3] Frontend (React Vite - Port 5173) baslatiliyor...
start "Filtration Frontend" cmd /k "cd /d "%~dp0filtration-frontend" && npm run dev"

echo.
echo Backend baslamasi icin bekleniyor (6 saniye)...
timeout /t 6 /nobreak >nul

echo.
echo [3/3] Sensor Simulatoru (sensor-bot.py) baslatiliyor...
start "Sensor Simulatoru" cmd /k "cd /d "%~dp0" && python sensor-bot.py"

echo.
echo Tarayici aciliyor: http://localhost:5173
start http://localhost:5173

echo.
echo ====================================================================
echo Tum servisler baslatildi.
echo - Backend API : http://localhost:3000
echo - Web Paneli  : http://localhost:5173
echo - Simulatör   : Canli veri akisi aktif
echo ====================================================================
