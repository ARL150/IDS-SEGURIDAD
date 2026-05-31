#!/usr/bin/env bash
# ============================================================
# IDS Institucional - Script de inicio del backend
# Uso: bash start.sh
# ============================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -f ".env" ]; then
    echo "⚠️  Archivo .env no encontrado. Copiando plantilla..."
    cp .env.example .env
    echo "✏️  Edita .env con tus credenciales SMTP y clave de AbuseIPDB."
fi

if [ ! -d "venv" ]; then
    echo "📦 Creando entorno virtual Python..."
    python3 -m venv venv
fi

source venv/bin/activate
echo "🔧 Instalando dependencias..."
pip install -q -r requirements.txt

echo ""
echo "🛡️  Iniciando IDS Institucional..."
echo "   Backend API: http://localhost:8000"
echo "   Docs:        http://localhost:8000/docs"
echo ""
# Scapy requiere privilegios root para captura real de paquetes
if [ "$(id -u)" -ne 0 ]; then
    echo "⚠️  ATENCIÓN: Para captura real de paquetes ejecuta como root:"
    echo "   sudo bash start.sh"
    echo "   (Sin root, el IDS funciona en modo configuración)"
fi
echo ""

python main.py
