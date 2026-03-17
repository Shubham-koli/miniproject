@echo off
title Diabetes Prediction System
color 0B

echo ============================================================
echo       DIABETES PREDICTION SYSTEM - Setup ^& Launch
echo ============================================================
echo.

:: Check Python
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH.
    echo Download Python from https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation.
    pause
    exit /b 1
)

echo [OK] Python found:
python --version
echo.

:: Create virtual environment if not exists
if not exist "venv" (
    echo [SETUP] Creating virtual environment...
    python -m venv venv
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
    echo [OK] Virtual environment created.
) else (
    echo [OK] Virtual environment already exists.
)
echo.

:: Activate virtual environment
echo [SETUP] Activating virtual environment...
call venv\Scripts\activate.bat

:: Install dependencies
echo [SETUP] Installing dependencies...
pip install -r requirements.txt --quiet
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies.
    pause
    exit /b 1
)
echo [OK] All dependencies installed.
echo.

:: Train models if not already trained
if not exist "models\scaler.joblib" (
    echo [SETUP] Training ML models (first time only)...
    python train_model.py
    if %errorlevel% neq 0 (
        echo [ERROR] Model training failed.
        pause
        exit /b 1
    )
    echo.
    echo [OK] Models trained successfully.
) else (
    echo [OK] Trained models found.
)
echo.

echo ============================================================
echo   Starting server at http://127.0.0.1:5000
echo   Press Ctrl+C to stop the server.
echo ============================================================
echo.

:: Open browser after a short delay
start "" http://127.0.0.1:5000

:: Start Flask
python app.py

:: Deactivate on exit
call venv\Scripts\deactivate.bat
