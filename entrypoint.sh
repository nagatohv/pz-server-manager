#!/bin/bash
set -e

echo "=== Iniciando Entrypoint de Zomboid Web Portal ==="

# Asegurar que los directorios necesarios existan en el volumen persistente
mkdir -p /home/steam/data/pzserver
mkdir -p /home/steam/data/Zomboid

# Comprobar si el juego ya está instalado
if [ ! -f "/home/steam/data/pzserver/start-server.sh" ]; then
    echo "[Entrypoint] Project Zomboid no está instalado en el volumen persistente (/home/steam/data/pzserver)."
    echo "[Entrypoint] Iniciando instalación inicial vía SteamCMD (esto descargará ~3-4 GB)..."
    
    # Determinar si se usa una rama beta
    BETA_ARGS=""
    if [ -n "$STEAMAPPBRANCH" ]; then
        echo "[Entrypoint] Usando rama de Steam: $STEAMAPPBRANCH"
        BETA_ARGS="-beta $STEAMAPPBRANCH"
    else
        echo "[Entrypoint] Usando rama de Steam por defecto (estable)"
    fi
    
    # Ejecutar steamcmd para descargar el servidor
    /home/steam/steamcmd/steamcmd.sh \
        +force_install_dir /home/steam/data/pzserver \
        +login anonymous \
        +app_update 380870 $BETA_ARGS validate \
        +quit
        
    echo "[Entrypoint] Instalación inicial completada con éxito."
else
    echo "[Entrypoint] Project Zomboid ya se encuentra instalado."
fi

# Iniciar la API del portal de Node.js
echo "[Entrypoint] Iniciando el portal web administrativo..."
cd /home/steam/app/server
exec node server.js
