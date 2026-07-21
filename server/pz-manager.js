import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import * as configManager from './config-manager.js';

const DATA_DIR = process.env.DATA_DIR || '/home/steam/data';
const PZ_SERVER_DIR = path.join(DATA_DIR, 'pzserver');
const ZO_USER_DIR = path.join(DATA_DIR, 'Zomboid');
const SERVER_NAME = process.env.SERVER_NAME || 'servertest';

// Variables para el proceso del juego
let pzProcess = null;
let pzStatus = 'STOPPED'; // STOPPED, STARTING, RUNNING, UPDATING, CRASHED
let activeClients = new Set();
const maxLogBuffer = 1000;
const logBuffer = [];

// Variables para el proceso de SteamCMD
let steamCmdProcess = null;

// Configuración de Memoria
const JVM_MIN_GB = process.env.JVM_MIN_GB || '4';
const JVM_MAX_GB = process.env.JVM_MAX_GB || '8';

// Configuración de auto-apagado por inactividad
let idleShutdownMinutes = 0;
let onlinePlayerCount = 0;
let idleShutdownTimer = null;
let idleShutdownExpiresAt = null;
let playerQueryInterval = null;

// Intentar cargar configuración de inactividad guardada
try {
  const panelConfig = configManager.readPanelConfig();
  idleShutdownMinutes = panelConfig.idleShutdownMinutes || 0;
} catch (err) {
  // Ignorar errores al cargar config inicial
}

export function getStatus() {
  // Intentar obtener consumo de recursos si el proceso está corriendo
  let stats = { cpu: 0, memory: 0 };
  if (pzProcess && pzStatus === 'RUNNING') {
    // Si estamos en Linux, podemos intentar leer el uso del proceso hijo
    // En entornos dockerizados, es más simple devolver valores simbólicos o consultar /proc
    try {
      const pid = pzProcess.pid;
      if (fs.existsSync(`/proc/${pid}/stat`)) {
        // Enfoque simplificado para evitar dependencias nativas: leer /proc
        const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8').split(' ');
        const utime = parseInt(stat[13]);
        const stime = parseInt(stat[14]);
        const rss = parseInt(stat[23]); // en páginas
        const pageSize = 4096; // 4KB por página por defecto en linux
        stats.memory = Math.round((rss * pageSize) / (1024 * 1024)); // MB
        stats.cpu = 'Activo'; // Simplificado, ya que calcular el % real requiere muestreo de tiempo
      }
    } catch (e) {
      // Ignorar errores en sistemas no Linux o accesos fallidos
    }
  }

  return {
    status: pzStatus,
    stats,
    onlinePlayers: onlinePlayerCount,
    idleShutdown: {
      minutes: idleShutdownMinutes,
      expiresAt: idleShutdownExpiresAt,
      timeRemaining: idleShutdownExpiresAt ? Math.max(0, Math.round((idleShutdownExpiresAt - Date.now()) / 1000)) : 0
    },
    config: {
      serverName: SERVER_NAME,
      jvmMin: JVM_MIN_GB,
      jvmMax: JVM_MAX_GB
    }
  };
}

export function registerClient(ws) {
  activeClients.add(ws);
  // Enviar los logs históricos acumulados en el buffer
  ws.send(JSON.stringify({ type: 'logs_history', data: logBuffer }));
  ws.send(JSON.stringify({ type: 'status_update', data: getStatus() }));
}

export function unregisterClient(ws) {
  activeClients.delete(ws);
}

function broadcast(messageObj) {
  const payload = JSON.stringify(messageObj);
  for (const client of activeClients) {
    if (client.readyState === 1) { // OPEN
      client.send(payload);
    }
  }
}

function appendLog(line) {
  const logLine = `[${new Date().toISOString()}] ${line}`;
  logBuffer.push(logLine);
  if (logBuffer.length > maxLogBuffer) {
    logBuffer.shift();
  }
  broadcast({ type: 'log', data: logLine });
}

// Configurar memoria en ProjectZomboid64.json antes de arrancar
function configureMemory() {
  const jsonPath = path.join(PZ_SERVER_DIR, 'ProjectZomboid64.json');
  if (!fs.existsSync(jsonPath)) {
    appendLog(`[Manager] Archivo ProjectZomboid64.json no encontrado en: ${jsonPath}. Se omitió el ajuste de memoria.`);
    return;
  }

  try {
    const rawData = fs.readFileSync(jsonPath, 'utf8');
    const config = JSON.parse(rawData);

    if (config.vmArgs) {
      // Filtrar argumentos de memoria existentes
      config.vmArgs = config.vmArgs.filter(arg => !arg.startsWith('-Xmx') && !arg.startsWith('-Xms'));
      // Añadir los nuevos
      config.vmArgs.push(`-Xms${JVM_MIN_GB}g`);
      config.vmArgs.push(`-Xmx${JVM_MAX_GB}g`);

      fs.writeFileSync(jsonPath, JSON.stringify(config, null, 4), 'utf8');
      appendLog(`[Manager] Memoria JVM configurada: Min=${JVM_MIN_GB}GB, Max=${JVM_MAX_GB}GB`);
    }
  } catch (err) {
    appendLog(`[Manager] Error al configurar memoria en ProjectZomboid64.json: ${err.message}`);
  }
}

export function startServer() {
  if (pzStatus === 'RUNNING' || pzStatus === 'STARTING' || pzStatus === 'UPDATING') {
    return { error: 'El servidor ya está en ejecución, iniciándose o actualizándose.' };
  }

  const scriptPath = path.join(PZ_SERVER_DIR, 'start-server.sh');
  if (!fs.existsSync(scriptPath)) {
    return { error: `No se encontró el script de inicio en ${scriptPath}. Asegúrate de actualizar/instalar el juego primero.` };
  }

  pzStatus = 'STARTING';
  
  // Limpiar cualquier intervalo/timer previo por seguridad
  if (playerQueryInterval) clearInterval(playerQueryInterval);
  if (idleShutdownTimer) clearTimeout(idleShutdownTimer);
  playerQueryInterval = null;
  idleShutdownTimer = null;
  idleShutdownExpiresAt = null;
  onlinePlayerCount = 0;

  broadcast({ type: 'status_update', data: getStatus() });
  appendLog('[Manager] Iniciando el servidor de Project Zomboid...');

  // Configurar memoria dinámica antes de arrancar
  configureMemory();

  // Asegurar que exista la carpeta Zomboid
  if (!fs.existsSync(ZO_USER_DIR)) {
    fs.mkdirSync(ZO_USER_DIR, { recursive: true });
  }

  // Ejecutar el script. Project Zomboid usa el directorio actual para algunas dependencias
  pzProcess = spawn('bash', [
    scriptPath,
    `-userdir=${ZO_USER_DIR}`,
    `-servername=${SERVER_NAME}`
  ], {
    cwd: PZ_SERVER_DIR,
    env: { ...process.env }
  });

  pzProcess.stdout.on('data', (data) => {
    const text = data.toString();
    const lines = text.split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        appendLog(line);

        // Parsear cantidad de jugadores a partir de la respuesta de 'players' o log del sistema
        const match = line.match(/(?:Players connected|Players)\s*\((\d+)\)/i);
        if (match) {
          const count = parseInt(match[1], 10);
          updatePlayerCount(count);
        }

        // Consultar conteo inmediatamente al detectar conexión o desconexión en logs
        if (line.includes(' connected') && line.includes('user ')) {
          setTimeout(queryPlayerCount, 2500);
        }
        if (line.includes(' disconnected') && line.includes('user ')) {
          setTimeout(queryPlayerCount, 2500);
        }

        // Detectar si el servidor ya terminó de cargar
        if (pzStatus === 'STARTING' && (
          line.includes('Zomboid Server is running') || 
          line.includes('RakNet startup') || 
          line.includes('Server started') ||
          line.includes('reborn')
        )) {
          pzStatus = 'RUNNING';
          broadcast({ type: 'status_update', data: getStatus() });
          appendLog('[Manager] El servidor de Project Zomboid está en línea y listo para recibir conexiones.');
          
          // Iniciar consulta periódica de jugadores cada minuto
          if (playerQueryInterval) clearInterval(playerQueryInterval);
          playerQueryInterval = setInterval(queryPlayerCount, 60000);
          queryPlayerCount();
        }
      }
    });
  });

  pzProcess.stderr.on('data', (data) => {
    const text = data.toString();
    const lines = text.split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        appendLog(`[STDERR] ${line}`);
      }
    });
  });

  pzProcess.on('exit', (code, signal) => {
    appendLog(`[Manager] El proceso del juego finalizó. Código: ${code}, Señal: ${signal}`);
    
    if (pzStatus === 'RUNNING' || pzStatus === 'STARTING') {
      // Si se apagó solo sin orden de detener, lo consideramos crash
      pzStatus = 'CRASHED';
    } else {
      pzStatus = 'STOPPED';
    }
    
    pzProcess = null;

    // Limpiar temporizadores e intervalos al apagarse
    if (playerQueryInterval) {
      clearInterval(playerQueryInterval);
      playerQueryInterval = null;
    }
    if (idleShutdownTimer) {
      clearTimeout(idleShutdownTimer);
      idleShutdownTimer = null;
    }
    idleShutdownExpiresAt = null;
    onlinePlayerCount = 0;

    broadcast({ type: 'status_update', data: getStatus() });
  });

  return { success: true };
}

export function stopServer() {
  if (pzStatus === 'STOPPED' || pzStatus === 'CRASHED') {
    return { error: 'El servidor ya está detenido.' };
  }

  if (pzStatus === 'UPDATING') {
    return { error: 'No se puede detener mientras se actualiza.' };
  }

  appendLog('[Manager] Solicitando detención segura del servidor (guardando partida)...');
  pzStatus = 'STOPPING'; // Estado transicional local
  
  // Limpiar temporizadores e intervalos al iniciar detención
  if (playerQueryInterval) {
    clearInterval(playerQueryInterval);
    playerQueryInterval = null;
  }
  if (idleShutdownTimer) {
    clearTimeout(idleShutdownTimer);
    idleShutdownTimer = null;
  }
  idleShutdownExpiresAt = null;
  onlinePlayerCount = 0;

  broadcast({ type: 'status_update', data: getStatus() });

  // Enviar comando para guardar
  sendCommand('save');
  
  // Esperar 5 segundos antes de enviar quit para dar tiempo a guardar
  setTimeout(() => {
    sendCommand('quit');
  }, 5000);

  // Configurar un timeout de seguridad por si el proceso se cuelga al cerrar
  setTimeout(() => {
    if (pzProcess) {
      appendLog('[Manager] El servidor no se detuvo a tiempo. Forzando cierre (SIGKILL)...');
      pzProcess.kill('SIGKILL');
      pzStatus = 'STOPPED';
      pzProcess = null;
      broadcast({ type: 'status_update', data: getStatus() });
    }
  }, 45000);

  return { success: true };
}

export function killServer() {
  if (!pzProcess) {
    return { error: 'No hay ningún proceso activo que detener.' };
  }

  appendLog('[Manager] Deteniendo servidor de forma forzosa (SIGKILL)...');
  pzProcess.kill('SIGKILL');
  pzStatus = 'STOPPED';
  pzProcess = null;

  // Limpiar temporizadores e intervalos al forzar parada
  if (playerQueryInterval) {
    clearInterval(playerQueryInterval);
    playerQueryInterval = null;
  }
  if (idleShutdownTimer) {
    clearTimeout(idleShutdownTimer);
    idleShutdownTimer = null;
  }
  idleShutdownExpiresAt = null;
  onlinePlayerCount = 0;

  broadcast({ type: 'status_update', data: getStatus() });
  return { success: true };
}

export function sendCommand(commandString) {
  if (!pzProcess || (pzStatus !== 'RUNNING' && pzStatus !== 'STARTING')) {
    return { error: 'El servidor no está activo para recibir comandos.' };
  }

  const cleanCommand = commandString.trim();
  appendLog(`[Admin Input] > ${cleanCommand}`);
  
  // Escribir en la entrada estándar del proceso de Java
  pzProcess.stdin.write(cleanCommand + '\n');
  return { success: true };
}

export function updateGame() {
  if (pzStatus === 'RUNNING' || pzStatus === 'STARTING' || pzStatus === 'UPDATING') {
    return { error: 'No se puede actualizar mientras el servidor está en ejecución o actualizándose.' };
  }

  pzStatus = 'UPDATING';
  broadcast({ type: 'status_update', data: getStatus() });
  appendLog('[Manager] Iniciando proceso de actualización vía SteamCMD...');

  const steamCmdDir = '/home/steam/steamcmd';
  const steamCmdPath = path.join(steamCmdDir, 'steamcmd.sh');

  if (!fs.existsSync(steamCmdPath)) {
    pzStatus = 'STOPPED';
    broadcast({ type: 'status_update', data: getStatus() });
    return { error: `No se encontró SteamCMD en: ${steamCmdPath}. Por favor reinicia el contenedor.` };
  }

  const branch = process.env.STEAMAPPBRANCH || '';
  const betaFlag = branch ? `-beta ${branch}` : '';

  appendLog(`[SteamCMD] Ejecutando descarga del AppID 380870 ${branch ? `(rama: ${branch})` : '(rama: estable stable)'}...`);

  // Ejecutar SteamCMD
  steamCmdProcess = spawn('bash', [
    steamCmdPath,
    '+force_install_dir', PZ_SERVER_DIR,
    '+login', 'anonymous',
    '+app_update', '380870',
    ...(branch ? ['-beta', branch] : []),
    'validate',
    '+quit'
  ]);

  steamCmdProcess.stdout.on('data', (data) => {
    const text = data.toString();
    const lines = text.split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        appendLog(`[SteamCMD] ${line}`);
      }
    });
  });

  steamCmdProcess.stderr.on('data', (data) => {
    const text = data.toString();
    const lines = text.split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        appendLog(`[SteamCMD ERROR] ${line}`);
      }
    });
  });

  steamCmdProcess.on('exit', (code) => {
    appendLog(`[SteamCMD] Proceso finalizado. Código de salida: ${code}`);
    pzStatus = 'STOPPED';
    steamCmdProcess = null;
    broadcast({ type: 'status_update', data: getStatus() });
  });

  return { success: true };
}

// Configurar externamente los valores del panel (ej: tiempo de inactividad)
export function setPanelConfig(config) {
  idleShutdownMinutes = config.idleShutdownMinutes || 0;
  appendLog(`[Manager] Configuración de auto-apagado por inactividad actualizada a: ${idleShutdownMinutes} minutos.`);
  checkIdleShutdown();
}

// Enviar el comando 'players' al proceso para consultar
export function queryPlayerCount() {
  if (pzProcess && pzStatus === 'RUNNING') {
    // Escribir en stdin de Java sin añadir log de "Admin Input"
    pzProcess.stdin.write('players\n');
  }
}

// Actualizar cantidad de jugadores y evaluar auto-apagado
function updatePlayerCount(count) {
  if (onlinePlayerCount !== count) {
    appendLog(`[Manager] Conteo de jugadores conectados actualizado: ${count}`);
    onlinePlayerCount = count;
    broadcast({ type: 'status_update', data: getStatus() });
  }
  checkIdleShutdown();
}

// Evaluar si corresponde iniciar o detener la cuenta atrás de apagado por inactividad
function checkIdleShutdown() {
  if (pzStatus !== 'RUNNING') {
    if (idleShutdownTimer) {
      clearTimeout(idleShutdownTimer);
      idleShutdownTimer = null;
      idleShutdownExpiresAt = null;
    }
    return;
  }

  if (idleShutdownMinutes > 0 && onlinePlayerCount === 0) {
    // Si no está ya programado el temporizador de apagado, lo programamos
    if (!idleShutdownTimer) {
      appendLog(`[Manager] El servidor está vacío. Programando apagado automático en ${idleShutdownMinutes} minutos.`);
      idleShutdownExpiresAt = Date.now() + idleShutdownMinutes * 60 * 1000;
      idleShutdownTimer = setTimeout(triggerIdleShutdown, idleShutdownMinutes * 60 * 1000);
      broadcast({ type: 'status_update', data: getStatus() });
    }
  } else {
    // Si hay jugadores online o la función está desactivada, cancelamos temporizador
    if (idleShutdownTimer) {
      appendLog(`[Manager] Se detectaron jugadores conectados (${onlinePlayerCount}) o el auto-apagado fue desactivado. Cancelando temporizador.`);
      clearTimeout(idleShutdownTimer);
      idleShutdownTimer = null;
      idleShutdownExpiresAt = null;
      broadcast({ type: 'status_update', data: getStatus() });
    }
  }
}

// Disparar apagado por inactividad
function triggerIdleShutdown() {
  appendLog(`[Manager] Ejecutando apagado automático por inactividad (0 jugadores conectados durante ${idleShutdownMinutes} minutos).`);
  idleShutdownTimer = null;
  idleShutdownExpiresAt = null;
  stopServer();
}
