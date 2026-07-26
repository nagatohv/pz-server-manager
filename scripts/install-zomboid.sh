#!/bin/bash
set -e

echo "=== [Game Installer] Comprobando instalación de Project Zomboid ==="

# Directorios de configuración
mkdir -p /home/steam/data/pzserver
mkdir -p /home/steam/data/Zomboid/mods

INSTALLED_BRANCH_FILE="/home/steam/data/installed_branch.txt"
CURRENT_BRANCH=""
if [ -f "$INSTALLED_BRANCH_FILE" ]; then
    CURRENT_BRANCH=$(cat "$INSTALLED_BRANCH_FILE" | tr -d '\r\n')
fi

BACKUP_DIR="/home/steam/data/pzserver_backup"

# Preparar cambio seguro si la rama difiere
if [ "$CURRENT_BRANCH" != "$STEAMAPPBRANCH" ]; then
    echo "[Installer] Cambio de rama detectado (anterior: '$CURRENT_BRANCH', nueva: '$STEAMAPPBRANCH'). Preparando cambio seguro..."
    rm -rf "$BACKUP_DIR"
    if [ -d "/home/steam/data/pzserver" ]; then
        mv "/home/steam/data/pzserver" "$BACKUP_DIR"
    fi
    mkdir -p /home/steam/data/pzserver
    # Limpiar base de datos SQLite anterior si existía para evitar incompatibilidades de esquema entre Build 41 y Build 42
    if [ -d "/home/steam/data/Zomboid/db" ]; then
        echo "[Installer] Limpiando esquema de base de datos antiguo de Zomboid/db..."
        rm -rf /home/steam/data/Zomboid/db/*
    fi
fi

# Instalar o actualizar si start-server.sh no existe
if [ ! -f "/home/steam/data/pzserver/start-server.sh" ]; then
    echo "[Installer] Instalando o actualizando Project Zomboid (rama: '$STEAMAPPBRANCH')..."
    
    APP_ID="${STEAM_APP_ID:-380870}"
    STEAM_CMD_ARGS=(
        +force_install_dir /home/steam/data/pzserver
        +login anonymous
        +app_update "$APP_ID"
    )
    if [ -n "$STEAMAPPBRANCH" ]; then
        STEAM_CMD_ARGS+=(-beta "$STEAMAPPBRANCH")
    fi
    STEAM_CMD_ARGS+=(validate +quit)

    set +e
    /home/steam/steamcmd/steamcmd.sh "${STEAM_CMD_ARGS[@]}"
    STEAMCMD_EXIT_CODE=$?
    set -e

    if [ $STEAMCMD_EXIT_CODE -eq 0 ] && [ -f "/home/steam/data/pzserver/start-server.sh" ]; then
        echo "[Installer] Instalación/actualización completada con éxito."
        echo "$STEAMAPPBRANCH" > "$INSTALLED_BRANCH_FILE"
        if [ -d "$BACKUP_DIR" ]; then
            echo "[Installer] Liberando espacio (eliminando versión antigua)..."
            rm -rf "$BACKUP_DIR"
        fi
    else
        echo "[Installer] ADVERTENCIA: La descarga inicial de SteamCMD no pudo completarse en este intento (Código: $STEAMCMD_EXIT_CODE)."
        if [ -d "$BACKUP_DIR" ]; then
            echo "[Installer] Restaurando versión anterior desde el backup..."
            rm -rf /home/steam/data/pzserver
            mv "$BACKUP_DIR" /home/steam/data/pzserver
            echo "[Installer] Versión anterior restaurada con éxito."
        else
            echo "[Installer] El portal web iniciará. Podrás presionar 'Actualizar Juego (SteamCMD)' desde el panel web para instalarlo."
        fi
    fi
else
    echo "[Installer] Project Zomboid ya se encuentra instalado en la rama configurada ($STEAMAPPBRANCH)."
fi
