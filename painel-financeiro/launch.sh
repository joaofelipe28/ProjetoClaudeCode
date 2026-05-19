#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Add Python user bin to PATH (where pip installs scripts on macOS)
export PATH="$HOME/Library/Python/3.9/bin:$PATH"

# Install deps if streamlit not found
if ! command -v streamlit &>/dev/null; then
    echo "Instalando dependências..."
    pip3 install -r requirements.txt --quiet
fi

echo "Iniciando Painel Financeiro em http://localhost:8501"
streamlit run app.py
