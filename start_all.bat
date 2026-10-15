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
start "Filtration Backend" cmd /k "cd /d "%~dp0filtration-backend" && npm run start:dev"

echo.
echo [2/2] Frontend (React Vite - Port 5173) baslatiliyor...
start "Filtration Frontend" cmd /k "cd /d "%~dp0filtration-frontend" && npm run dev"

echo.
echo Servisler hazirlanirken bekleniyor (5 saniye)...
timeout /t 5 /nobreak >nul

echo.
echo Tarayici aciliyor: http://localhost:5173
start http://localhost:5173

echo.
echo ====================================================================
echo Servisler baslatildi.
echo - Backend API : http://localhost:3000
echo - Web Paneli  : http://localhost:5173
echo - Simulatör   : Calistirilmadi (gercek sensor icin)
echo ====================================================================
