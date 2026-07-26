#!/bin/bash
set -e

echo "=== Iniciando Entrypoint de Zomboid Web Portal ==="

# Ejecutar el instalador/actualizador del juego
/home/steam/install-zomboid.sh

# Iniciar la API del portal web administrativo (Clean Architecture en producción)
echo "[Entrypoint] Iniciando el portal web administrativo..."
cd /home/steam/app/server
exec node dist/server.js
