@echo off
title SnEAKs Vault Backend Server
cd /d "%~dp0"

echo ========================================================
echo   SnEAKs Vault Ghana - Full-Stack Launcher
echo ========================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Node.js was not detected on your system.
    echo.
    echo Node.js is required to run the JavaScript backend API.
    echo Opening the official Node.js installer page...
    start https://nodejs.org/en/download
    echo.
    echo Opening your SnEAKs storefront in the browser...
    start index.html
    echo.
    echo Install Node.js, then double-click this file again!
    echo ========================================================
    pause
    exit /b
)

echo [*] Node.js is detected!
node -v

if not exist node_modules (
    echo [*] Checking dependencies...
    echo [*] Starting server in Zero-Dependency Native mode...
)

echo.
echo [*] Starting backend server at http://localhost:5000 ...
start "" "http://localhost:5000"
node server.js

pause

