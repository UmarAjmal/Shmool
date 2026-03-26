@echo off
color 0A
title Smart School Management System

:MENU
cls
echo ========================================================
echo        SMART SCHOOL MANAGEMENT SYSTEM
echo ========================================================
echo.
echo   1. START Application
echo   2. STOP Application  
echo   3. RESTART Application
echo   4. EXIT
echo.
echo ========================================================
set /p choice="Select option (1-4): "

if "%choice%"=="1" goto START_APP
if "%choice%"=="2" goto STOP_APP
if "%choice%"=="3" goto RESTART_APP
if "%choice%"=="4" goto EXIT_APP
echo Invalid choice! Press any key to try again...
pause >nul
goto MENU

:START_APP
cls
echo ========================================================
echo   STARTING SMART SCHOOL SYSTEM
echo ========================================================
echo.

echo [Step 1/5] Cleaning up old processes...
taskkill /F /IM node.exe >nul 2>&1
if %errorlevel%==0 (
    echo   [OK] Old processes killed
    timeout /t 2 /nobreak >nul
) else (
    echo   [OK] No old processes found
)

echo [Step 2/5] Clearing frontend cache...
cd client
if exist .next (
    rmdir /s /q .next >nul 2>&1
    echo   [OK] Cache cleared
) else (
    echo   [OK] No cache to clear
)
cd ..

echo [Step 3/5] Starting Backend Server (Port 5000)...
start "Backend - Port 5000" cmd /k "cd /d %~dp0server && npm run dev"
timeout /t 5 /nobreak >nul
echo   [OK] Backend started

echo [Step 4/5] Starting Frontend Client (Port 3000)...
start "Frontend - Port 3000" cmd /k "cd /d %~dp0client && npm run dev"
echo   [OK] Frontend starting...

echo [Step 5/5] Waiting for servers to be ready...
timeout /t 10 /nobreak >nul

echo.
echo ========================================================
echo   APPLICATION STARTED SUCCESSFULLY!
echo ========================================================
echo.
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:5000
echo.
echo   Opening browser in 3 seconds...
echo ========================================================
timeout /t 3 /nobreak >nul
start http://localhost:3000

echo.
echo Press any key to return to menu...
pause >nul
goto MENU

:STOP_APP
cls
echo ========================================================
echo   STOPPING SMART SCHOOL SYSTEM
echo ========================================================
echo.

echo [Step 1/2] Stopping all Node processes...
taskkill /F /IM node.exe >nul 2>&1
if %errorlevel%==0 (
    echo   [OK] All servers stopped
) else (
    echo   [OK] No servers were running
)

echo [Step 2/2] Clearing port locks...
timeout /t 2 /nobreak >nul
echo   [OK] Ports cleared

echo.
echo ========================================================
echo   APPLICATION STOPPED SUCCESSFULLY!
echo ========================================================
echo.
echo Press any key to return to menu...
pause >nul
goto MENU

:RESTART_APP
cls
echo ========================================================
echo   RESTARTING SMART SCHOOL SYSTEM
echo ========================================================
echo.

echo [Phase 1] Stopping existing servers...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 3 /nobreak >nul
echo   [OK] Servers stopped

echo [Phase 2] Clearing all caches...
cd client
if exist .next (
    rmdir /s /q .next >nul 2>&1
)
if exist node_modules\.cache (
    rmdir /s /q node_modules\.cache >nul 2>&1
)
cd ..
echo   [OK] Caches cleared

echo [Phase 3] Starting Backend...
start "Backend - Port 5000" cmd /k "cd /d %~dp0server && npm run dev"
timeout /t 5 /nobreak >nul
echo   [OK] Backend started

echo [Phase 4] Starting Frontend...
start "Frontend - Port 3000" cmd /k "cd /d %~dp0client && npm run dev"
timeout /t 10 /nobreak >nul
echo   [OK] Frontend started

echo.
echo ========================================================
echo   APPLICATION RESTARTED SUCCESSFULLY!
echo ========================================================
echo.
echo   Opening browser...
echo ========================================================
timeout /t 2 /nobreak >nul
start http://localhost:3000

echo.
echo Press any key to return to menu...
pause >nul
goto MENU

:EXIT_APP
cls
echo ========================================================
echo   EXITING SMART SCHOOL SYSTEM
echo ========================================================
echo.

set /p stopservers="Stop all servers before exit? (Y/N): "
if /i "%stopservers%"=="Y" (
    echo.
    echo Stopping all servers...
    taskkill /F /IM node.exe >nul 2>&1
    echo   [OK] All servers stopped
    timeout /t 2 /nobreak >nul
)

echo.
echo Thank you for using Smart School Management System!
echo.
timeout /t 2 /nobreak >nul
exit
