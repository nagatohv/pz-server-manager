# --- ETAPA DE COMPILACIÓN ---
FROM ubuntu:22.04 AS builder

# Evitar prompts interactivos
ENV DEBIAN_FRONTEND=noninteractive

# Instalar dependencias necesarias para Node.js y curl
# Se añaden librerías de 32 bits que requiere SteamCMD
RUN dpkg --add-architecture i386 && \
    apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Instalar Node.js 20 LTS
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Crear estructura de carpetas
WORKDIR /app

# Copiar archivos del cliente y compilar
COPY client/package*.json ./client/
RUN cd client && npm install

COPY client/ ./client/
RUN cd client && npm run build

# Copiar archivos del servidor e instalar dependencias
COPY server/package*.json ./server/
RUN cd server && npm install --only=production
COPY server/ ./server/


# --- ETAPA DE PRODUCCIÓN ---
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Instalar dependencias para SteamCMD y Project Zomboid (incluyendo JRE embebido)
RUN dpkg --add-architecture i386 && \
    apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    lib32gcc-s1 \
    lib32stdc++6 \
    libc6-i386 \
    lib32z1 \
    unzip \
    procps \
    bash \
    && rm -rf /var/lib/apt/lists/*

# Instalar Node.js runtime en la imagen de producción
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Crear usuario unprivileged 'steam'
RUN useradd -m -s /bin/bash steam

USER steam
WORKDIR /home/steam

# Instalar SteamCMD en el directorio del usuario steam
RUN mkdir -p /home/steam/steamcmd && \
    cd /home/steam/steamcmd && \
    curl -sqL "https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz" | tar zxvf -

# Copiar la aplicación compilada del constructor
COPY --from=builder --chown=steam:steam /app/server /home/steam/app/server
COPY --from=builder --chown=steam:steam /app/client/dist /home/steam/app/client/dist

# Copiar el script de entrada (entrypoint.sh)
COPY --chown=steam:steam entrypoint.sh /home/steam/entrypoint.sh
RUN chmod +x /home/steam/entrypoint.sh

# Crear la carpeta de datos persistente (donde se montará el volumen de Dokploy)
RUN mkdir -p /home/steam/data

# Puertos expuestos:
# 3000 -> Portal Web (HTTP)
# 16261/udp -> Puerto principal de PZ
# 16262/udp -> Puerto de conexión directa de PZ
# 8766/udp -> Puerto de Steam Query
EXPOSE 3000
EXPOSE 16261/udp
EXPOSE 16262/udp
EXPOSE 8766/udp

# Variables de entorno por defecto
ENV PORT=3000
ENV DATA_DIR=/home/steam/data
ENV SERVER_NAME=servertest
ENV JVM_MIN_GB=4
ENV JVM_MAX_GB=8

ENTRYPOINT ["/home/steam/entrypoint.sh"]
