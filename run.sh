#!/bin/bash

echo "============================================================"
echo "      DIABETES PREDICTION SYSTEM - Setup & Launch"
echo "============================================================"
echo

# Check Python
if command -v python3 &>/dev/null; then
    PY=python3
elif command -v python &>/dev/null; then
    PY=python
else
    echo "[ERROR] Python is not installed."
    echo "Install Python 3.7+ from https://www.python.org/downloads/"
    exit 1
fi

echo "[OK] Python found: $($PY --version)"
echo

# Create virtual environment if not exists
if [ ! -d "venv" ]; then
    echo "[SETUP] Creating virtual environment..."
    $PY -m venv venv
    echo "[OK] Virtual environment created."
else
    echo "[OK] Virtual environment already exists."
fi
echo

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "[SETUP] Installing dependencies..."
pip install -r requirements.txt --quiet
echo "[OK] All dependencies installed."
echo

# Train models if not already trained
if [ ! -f "models/scaler.joblib" ]; then
    echo "[SETUP] Training ML models (first time only)..."
    $PY train_model.py
    echo
    echo "[OK] Models trained successfully."
else
    echo "[OK] Trained models found."
fi
echo

echo "============================================================"
echo "  Starting server at http://127.0.0.1:5000"
echo "  Press Ctrl+C to stop the server."
echo "============================================================"
echo

# Open browser
if command -v open &>/dev/null; then
    open http://127.0.0.1:5000 &
elif command -v xdg-open &>/dev/null; then
    xdg-open http://127.0.0.1:5000 &
fi

# Start Flask
$PY app.py

deactivate
