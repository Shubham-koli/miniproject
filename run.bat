@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================================
REM  Diabetes Prediction System - Windows one-click launcher
REM  Works on a fresh Windows 10/11 install.
REM ============================================================

REM Run from the folder this script lives in, regardless of where
REM the user launched it from (Explorer double-click, shortcut,
REM a shell in another directory, etc.).
pushd "%~dp0" >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Could not change to the script directory:
    echo         %~dp0
    pause
    exit /b 1
)

REM Use UTF-8 so pip/Python output with non-ASCII characters does
REM not render as mojibake on systems whose default code page is
REM CP437/CP850/etc. Failure is non-fatal.
chcp 65001 >nul 2>&1

title Diabetes Prediction System
color 0B

echo ============================================================
echo       DIABETES PREDICTION SYSTEM - Setup ^& Launch
echo ============================================================
echo.

REM ------------------------------------------------------------
REM  1. Locate a usable Python 3 interpreter.
REM ------------------------------------------------------------
call :FindPython
if not defined PY_CMD (
    echo [ERROR] Python 3 is not installed or not on PATH.
    echo.
    echo Install Python 3.10, 3.11, or 3.12 from:
    echo     https://www.python.org/downloads/
    echo.
    echo During installation, tick the checkbox:
    echo     "Add python.exe to PATH".
    echo.
    echo If you already installed Python and still see this,
    echo you may have only the Microsoft Store "App execution
    echo alias" - turn it off in Settings ^> Apps ^> Advanced
    echo app settings ^> App execution aliases.
    echo.
    pause
    popd >nul 2>&1
    exit /b 1
)
echo [OK] Python interpreter: %PY_CMD%
%PY_CMD% --version
echo.

REM ------------------------------------------------------------
REM  2. Create, validate, or rebuild the virtual environment.
REM ------------------------------------------------------------
REM  If venv\ exists but its bundled python.exe will not run,
REM  the venv is broken (usually because the interpreter it was
REM  built against was uninstalled or upgraded). Wipe and rebuild
REM  rather than leaving the user staring at cryptic DLL errors.
REM ------------------------------------------------------------
set "VENV_PY=venv\Scripts\python.exe"

if exist "%VENV_PY%" (
    "%VENV_PY%" --version >nul 2>&1
    if errorlevel 1 (
        echo [WARN] Existing virtual environment is broken. Rebuilding...
        rmdir /s /q "venv" >nul 2>&1
    )
)

if not exist "%VENV_PY%" (
    echo [SETUP] Creating virtual environment...
    %PY_CMD% -m venv venv
    if errorlevel 1 (
        echo [ERROR] Could not create the virtual environment.
        echo         Your Python install may be missing the 'venv'
        echo         module, or you lack write permission here.
        pause
        popd >nul 2>&1
        exit /b 1
    )
    echo [OK] Virtual environment created.
) else (
    echo [OK] Virtual environment already exists.
)
echo.

REM ------------------------------------------------------------
REM  3. Install / upgrade Python packages.
REM ------------------------------------------------------------
REM  Upgrade pip, setuptools, and wheel first. Fresh venvs often
REM  ship with a pip too old to resolve modern wheel filenames,
REM  which makes later installs fail for no visible reason.
REM  We do NOT pass --quiet: if pip fails, the user needs to see
REM  the actual error message, not a generic "install failed".
REM ------------------------------------------------------------
echo [SETUP] Upgrading pip, setuptools, wheel...
"%VENV_PY%" -m pip install --upgrade --disable-pip-version-check pip setuptools wheel
if errorlevel 1 (
    echo [ERROR] Failed to upgrade pip. Check your internet
    echo         connection, and any proxy or firewall settings.
    pause
    popd >nul 2>&1
    exit /b 1
)
echo.

echo [SETUP] Installing project dependencies (this may take a minute)...
"%VENV_PY%" -m pip install --disable-pip-version-check -r requirements.txt
if errorlevel 1 (
    echo.
    echo [ERROR] Failed to install one or more dependencies.
    echo         Scroll up to see the exact pip error.
    echo.
    echo Common causes:
    echo   - No internet connection, or a firewall blocking pip
    echo   - Python version too new for the pinned packages
    echo     ^(numpy 1.26.2 / scikit-learn 1.3.2 have no wheels
    echo      for Python 3.13+; install Python 3.10-3.12 instead^)
    echo.
    pause
    popd >nul 2>&1
    exit /b 1
)
echo [OK] All dependencies installed.
echo.

REM ------------------------------------------------------------
REM  4. Train the ML models on first run only.
REM ------------------------------------------------------------
if not exist "models\scaler.joblib" (
    echo [SETUP] Training ML models ^(first run only, ~30 seconds^)...
    "%VENV_PY%" train_model.py
    if errorlevel 1 (
        echo [ERROR] Model training failed. See output above.
        pause
        popd >nul 2>&1
        exit /b 1
    )
    echo.
    echo [OK] Models trained successfully.
) else (
    echo [OK] Trained models found.
)
echo.

REM ------------------------------------------------------------
REM  5. Start Flask and open the browser when the server is up.
REM ------------------------------------------------------------
REM  The previous version launched the browser immediately, so
REM  the first page load usually hit a "site can't be reached"
REM  error because Flask had not yet bound port 5000. Spawn a
REM  background PowerShell waiter instead: it polls the URL and
REM  only opens the browser once the server actually answers.
REM ------------------------------------------------------------
echo ============================================================
echo   Starting server at http://127.0.0.1:5000
echo   Press Ctrl+C to stop the server.
echo ============================================================
echo.

start "" /b powershell -NoProfile -WindowStyle Hidden -Command "$u='http://127.0.0.1:5000'; for($i=0; $i -lt 60; $i++){ try{ $null = Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 1; Start-Process $u; exit } catch{ Start-Sleep -Milliseconds 500 } }"

"%VENV_PY%" app.py
set "APP_EXIT=%errorlevel%"

echo.
if not "%APP_EXIT%"=="0" (
    echo [WARN] Server exited with code %APP_EXIT%.
) else (
    echo Server stopped.
)

popd >nul 2>&1
endlocal
pause
exit /b 0


REM ============================================================
REM  Subroutine: locate a working Python 3 interpreter.
REM  Sets PY_CMD, or leaves it empty if none is usable.
REM ============================================================
:FindPython
set "PY_CMD="

REM Prefer the `py` launcher. Try known-compatible versions first
REM (3.12 / 3.11 / 3.10), then fall back to whatever `py -3` gives.
where py >nul 2>&1
if not errorlevel 1 (
    for %%V in (3.12 3.11 3.10) do (
        py -%%V --version >nul 2>&1
        if not errorlevel 1 (
            set "PY_CMD=py -%%V"
            goto :eof
        )
    )
    py -3 --version >nul 2>&1
    if not errorlevel 1 (
        set "PY_CMD=py -3"
        goto :eof
    )
)

REM Fall back to `python` on PATH, but reject the Windows Store
REM stub - it exits 0 on --version but prints nothing, so we
REM verify the output actually looks like "Python 3.x".
where python >nul 2>&1
if not errorlevel 1 (
    for /f "tokens=*" %%V in ('python --version 2^>^&1') do set "PV=%%V"
    echo !PV! | findstr /R /C:"^Python 3\." >nul
    if not errorlevel 1 (
        set "PY_CMD=python"
        goto :eof
    )
)

REM Last resort: python3 (uncommon on Windows, but possible).
where python3 >nul 2>&1
if not errorlevel 1 (
    for /f "tokens=*" %%V in ('python3 --version 2^>^&1') do set "PV=%%V"
    echo !PV! | findstr /R /C:"^Python 3\." >nul
    if not errorlevel 1 (
        set "PY_CMD=python3"
        goto :eof
    )
)

goto :eof
