@echo off
title AAS Tools Platform
cd /d "%~dp0"

:: Port 5173 freigeben falls belegt
netstat -ano | findstr ":5173.*LISTENING" >nul 2>&1
if %errorlevel%==0 (
    echo Port 5173 belegt, beende alten Prozess...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173.*LISTENING"') do (
        taskkill /F /PID %%a >nul 2>&1
    )
    timeout /t 1 >nul
)

if not exist node_modules (
    echo Installiere Abhängigkeiten...
    call npm install
    echo.
)

echo Starte AAS Tools Platform...
call npm run dev
pause
