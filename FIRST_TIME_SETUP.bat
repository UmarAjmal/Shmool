@echo off
color 0B
title First Time Setup - Smart School System

echo ========================================================
echo   FIRST TIME SETUP
echo   Smart School Management System
echo ========================================================
echo.
echo   This will install all required dependencies.
echo   This may take 5-10 minutes depending on your internet.
echo.
echo ========================================================
pause

cls
echo ========================================================
echo   INSTALLING DEPENDENCIES
echo ========================================================
echo.

echo [1/2] Installing Backend Dependencies...
cd server
call npm install
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Backend installation failed!
    echo Please check your internet connection and try again.
    pause
    exit /b 1
)
echo   [SUCCESS] Backend dependencies installed!
cd ..

echo.
echo [2/2] Installing Frontend Dependencies...
cd client
call npm install
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Frontend installation failed!
    echo Please check your internet connection and try again.
    pause
    exit /b 1
)
echo   [SUCCESS] Frontend dependencies installed!
cd ..

echo.
echo ========================================================
echo   INSTALLATION COMPLETE!
echo ========================================================
echo.
echo   Next Steps:
echo   1. Close this window
echo   2. Double click "RUN_APP.bat" to start the application
echo.
echo ========================================================
pause
