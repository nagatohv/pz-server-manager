#!/bin/bash
set -e

echo "=== Iniciando Entrypoint de Zomboid Web Portal ==="

# Asegurar que los directorios necesarios existan en el volumen persistente
mkdir -p /home/steam/data/pzserver
mkdir -p /home/steam/data/Zomboid/mods

INSTALLED_BRANCH_FILE="/home/steam/data/installed_branch.txt"
CURRENT_BRANCH=""
if [ -f "$INSTALLED_BRANCH_FILE" ]; then
    CURRENT_BRANCH=$(cat "$INSTALLED_BRANCH_FILE" | tr -d '\r\n')
fi

BACKUP_DIR="/home/steam/data/pzserver_backup"

# Si la rama configurada es distinta a la instalada, preparar cambio seguro
if [ "$CURRENT_BRANCH" != "$STEAMAPPBRANCH" ]; then
    echo "[Entrypoint] Cambio de rama detectado (anterior: '$CURRENT_BRANCH', nueva: '$STEAMAPPBRANCH'). Preparando cambio seguro..."
    rm -rf "$BACKUP_DIR"
    if [ -d "/home/steam/data/pzserver" ]; then
        mv "/home/steam/data/pzserver" "$BACKUP_DIR"
    fi
    mkdir -p /home/steam/data/pzserver
fi

# Comprobar si el juego ya está instalado o si debemos instalar/actualizar
if [ ! -f "/home/steam/data/pzserver/start-server.sh" ]; then
    echo "[Entrypoint] Instalando o actualizando Project Zomboid (rama: '$STEAMAPPBRANCH')..."
    
    # Determinar si se usa una rama beta
    BETA_ARGS=""
    if [ -n "$STEAMAPPBRANCH" ]; then
        echo "[Entrypoint] Usando rama de Steam: $STEAMAPPBRANCH"
        BETA_ARGS="-beta $STEAMAPPBRANCH"
    else
        echo "[Entrypoint] Usando rama de Steam por defecto (estable)"
    fi
    
    # Ejecutar steamcmd para descargar el servidor
    # Desactivar temporalmente exit-on-error para poder restaurar si falla
    set +e
    /home/steam/steamcmd/steamcmd.sh \
        +force_install_dir /home/steam/data/pzserver \
        +login anonymous \
        +app_update 380870 $BETA_ARGS validate \
        +quit
    STEAMCMD_EXIT_CODE=$?
    set -e

    # Verificar si la instalación tuvo éxito
    if [ $STEAMCMD_EXIT_CODE -eq 0 ] && [ -f "/home/steam/data/pzserver/start-server.sh" ]; then
        echo "[Entrypoint] Instalación/actualización completada con éxito."
        echo "$STEAMAPPBRANCH" > "$INSTALLED_BRANCH_FILE"
        if [ -d "$BACKUP_DIR" ]; then
            echo "[Entrypoint] Liberando espacio (eliminando versión antigua)..."
            rm -rf "$BACKUP_DIR"
        fi
    else
        echo "[Entrypoint] ERROR: La descarga o validación falló (Código: $STEAMCMD_EXIT_CODE)."
        if [ -d "$BACKUP_DIR" ]; then
            echo "[Entrypoint] Restaurando versión anterior desde el backup..."
            rm -rf /home/steam/data/pzserver
            mv "$BACKUP_DIR" /home/steam/data/pzserver
            echo "[Entrypoint] Versión anterior restaurada con éxito."
        else
            echo "[Entrypoint] No hay versión anterior para restaurar."
            exit 1
        fi
    fi
else
    echo "[Entrypoint] Project Zomboid ya se encuentra instalado en la rama configurada ($STEAMAPPBRANCH)."
fi

# Iniciar la API del portal de Node.js
echo "[Entrypoint] Iniciando el portal web administrativo..."
cd /home/steam/app/server
exec node server.js
