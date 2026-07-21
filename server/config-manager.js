import fs from 'fs';
import path from 'path';

const DATA_DIR = process.env.DATA_DIR || '/home/steam/data';
const ZO_USER_DIR = path.join(DATA_DIR, 'Zomboid');
const SERVER_NAME = process.env.SERVER_NAME || 'servertest';

const getConfigDir = () => path.join(ZO_USER_DIR, 'Server');

const getFilePath = (ext) => {
  const serverName = process.env.SERVER_NAME || 'servertest';
  if (ext === 'ini') {
    return path.join(getConfigDir(), `${serverName}.ini`);
  } else if (ext === 'sandbox') {
    return path.join(getConfigDir(), `${serverName}_SandboxVars.lua`);
  } else if (ext === 'spawn') {
    return path.join(getConfigDir(), `${serverName}_spawnregions.lua`);
  }
  return null;
};

// Generar una plantilla básica de server.ini si no existe
function ensureDefaultIni(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(filePath)) {
    const defaultContent = `# Plantilla por defecto generada por PZ Web Portal
MaxPlayers=16
Public=true
Password=
Port=16261
RCONPort=27015
RCONPassword=change-me-rcon
Mods=
WorkshopItems=
Open=true
PVP=true
PauseWhenEmpty=true
`;
    fs.writeFileSync(filePath, defaultContent, 'utf8');
  }
}

// Parsear el archivo INI conservando comentarios y orden
export function parseIniFile() {
  const filePath = getFilePath('ini');
  ensureDefaultIni(filePath);

  try {
    const rawContent = fs.readFileSync(filePath, 'utf8');
    const lines = rawContent.split(/\r?\n/);
    const parsed = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (trimmed.startsWith('#') || trimmed.startsWith(';') || trimmed === '') {
        parsed.push({ type: 'comment', value: line });
      } else if (trimmed.includes('=')) {
        const index = line.indexOf('=');
        const key = line.substring(0, index).trim();
        const value = line.substring(index + 1).trim();
        parsed.push({ type: 'setting', key, value, originalLine: line });
      } else {
        parsed.push({ type: 'comment', value: line }); // Tratar líneas raras como comentarios
      }
    }
    return parsed;
  } catch (err) {
    throw new Error(`Error al leer server.ini: ${err.message}`);
  }
}

// Guardar los ajustes en el archivo INI conservando comentarios
export function saveIniSettings(settingsObj) {
  const filePath = getFilePath('ini');
  try {
    const currentStructure = parseIniFile();
    const outputLines = [];

    const keysToUpdate = { ...settingsObj };

    for (const item of currentStructure) {
      if (item.type === 'comment') {
        outputLines.push(item.value);
      } else if (item.type === 'setting') {
        if (item.key in keysToUpdate) {
          outputLines.push(`${item.key}=${keysToUpdate[item.key]}`);
          delete keysToUpdate[item.key]; // Remover de los pendientes
        } else {
          outputLines.push(`${item.key}=${item.value}`);
        }
      }
    }

    // Agregar nuevos ajustes que no estaban en el archivo original
    for (const [key, val] of Object.entries(keysToUpdate)) {
      outputLines.push(`${key}=${val}`);
    }

    fs.writeFileSync(filePath, outputLines.join('\n'), 'utf8');
    return { success: true };
  } catch (err) {
    throw new Error(`Error al guardar server.ini: ${err.message}`);
  }
}

// Leer archivo crudo (cualquier extensión admitida)
export function readRawFile(type) {
  const filePath = getFilePath(type);
  if (!filePath) throw new Error('Tipo de archivo inválido');

  if (!fs.existsSync(filePath)) {
    return '';
  }

  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    throw new Error(`Error al leer archivo ${type}: ${err.message}`);
  }
}

// Guardar archivo crudo de forma segura
export function saveRawFile(type, content) {
  const filePath = getFilePath(type);
  if (!filePath) throw new Error('Tipo de archivo inválido');

  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  try {
    // Sanitización básica: Validar que no se intente escribir fuera del directorio de configuración
    const resolvedPath = path.resolve(filePath);
    const resolvedConfigDir = path.resolve(getConfigDir());
    if (!resolvedPath.startsWith(resolvedConfigDir)) {
      throw new Error('Intento de Path Traversal detectado.');
    }

    fs.writeFileSync(filePath, content, 'utf8');
    return { success: true };
  } catch (err) {
    throw new Error(`Error al escribir archivo ${type}: ${err.message}`);
  }
}

// Leer la configuración del panel (tiempo de inactividad, etc.)
export function readPanelConfig() {
  const filePath = path.join(DATA_DIR, 'panel_config.json');
  if (!fs.existsSync(filePath)) {
    return { idleShutdownMinutes: 0 };
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return { idleShutdownMinutes: 0 };
  }
}

// Guardar la configuración del panel
export function savePanelConfig(config) {
  const filePath = path.join(DATA_DIR, 'panel_config.json');
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const cleanConfig = {
      idleShutdownMinutes: Math.max(0, parseInt(config.idleShutdownMinutes, 10) || 0)
    };
    fs.writeFileSync(filePath, JSON.stringify(cleanConfig, null, 2), 'utf8');
    return cleanConfig;
  } catch (err) {
    throw new Error(`Error al guardar panel_config.json: ${err.message}`);
  }
}
