#!/bin/bash
set -e

# Deshabilitar volcados de memoria (core dumps) para evitar llenar el disco en caso de crash
ulimit -c 0

echo "=== Iniciando Entrypoint de Zomboid Web Portal ==="
echo "=== No auto-install: el operador debe crear la primera instancia desde el portal web ==="

# Iniciar la API del portal web administrativo (Clean Architecture en producción)
echo "[Entrypoint] Iniciando el portal web administrativo..."
cd /home/steam/app/server
exec node dist/server.js
