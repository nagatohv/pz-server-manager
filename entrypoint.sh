#!/bin/bash
set -e

echo "=== Iniciando Entrypoint de Zomboid Web Portal ==="
echo "=== No auto-install: el operador debe crear la primera instancia desde el portal web ==="

# Iniciar la API del portal web administrativo (Clean Architecture en producción)
echo "[Entrypoint] Iniciando el portal web administrativo..."
cd /home/steam/app/server
exec node dist/server.js
