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

export function parseIniFileWithDescriptions() {
  const rawStructure = parseIniFile();
  const settings = [];
  let currentComments = [];
  
  for (const item of rawStructure) {
    if (item.type === 'comment') {
      const cleanComment = item.value.replace(/^[#;]\s*/, '').trim();
      if (cleanComment) {
        currentComments.push(cleanComment);
      }
    } else if (item.type === 'setting') {
      settings.push({
        key: item.key,
        value: item.value,
        description: currentComments.join(' ')
      });
      currentComments = [];
    }
  }
  return settings;
}

export function parseSandboxVars(content) {
  const values = {};
  const descriptions = {};
  const lines = content.split(/\r?\n/);
  
  let currentGroup = values;
  const groupStack = [];
  let currentGroupPath = '';
  const pathStack = [];
  
  let pendingComments = [];
  
  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Detectar comentarios
    if (trimmed.startsWith('--')) {
      const commentText = trimmed.replace(/^--\s*/, '').trim();
      if (commentText) {
        pendingComments.push(commentText);
      }
      continue;
    }
    
    // Si no es un comentario, ver si tiene comentario al final de la línea
    let cleanLine = trimmed;
    const commentIndex = cleanLine.indexOf('--');
    if (commentIndex !== -1) {
      const inlineComment = cleanLine.substring(commentIndex).replace(/^--\s*/, '').trim();
      if (inlineComment) {
        pendingComments.push(inlineComment);
      }
      cleanLine = cleanLine.substring(0, commentIndex).trim();
    }
    
    // Detectar fin de grupo
    if (cleanLine === '}' || cleanLine === '},') {
      if (groupStack.length > 0) {
        currentGroup = groupStack.pop();
        currentGroupPath = pathStack.pop();
      }
      pendingComments = []; // Descartar comentarios huérfanos al final de un grupo
      continue;
    }
    
    // Detectar inicio de grupo: Group = {
    const groupMatch = cleanLine.match(/^([a-zA-Z0-9_]+)\s*=\s*\{$/);
    if (groupMatch) {
      const groupName = groupMatch[1];
      if (groupName !== 'SandboxVars') {
        currentGroup[groupName] = {};
        
        const fullPath = currentGroupPath ? `${currentGroupPath}.${groupName}` : groupName;
        if (pendingComments.length > 0) {
          descriptions[fullPath] = pendingComments.join(' ');
          pendingComments = [];
        }
        
        groupStack.push(currentGroup);
        pathStack.push(currentGroupPath);
        
        currentGroup = currentGroup[groupName];
        currentGroupPath = fullPath;
      }
      continue;
    }
    
    // Detectar asignación: Key = Value,
    const assignMatch = cleanLine.match(/^([a-zA-Z0-9_]+)\s*=\s*(.*?),?$/);
    if (assignMatch) {
      const key = assignMatch[1];
      let rawVal = assignMatch[2].trim();
      if (rawVal.endsWith(',')) rawVal = rawVal.slice(0, -1).trim();
      
      let val = rawVal;
      if (rawVal === 'true') val = true;
      else if (rawVal === 'false') val = false;
      else if (!isNaN(Number(rawVal))) val = Number(rawVal);
      else if ((rawVal.startsWith('"') && rawVal.endsWith('"')) || (rawVal.startsWith("'") && rawVal.endsWith("'"))) {
        val = rawVal.slice(1, -1);
      }
      
      currentGroup[key] = val;
      
      const fullPath = currentGroupPath ? `${currentGroupPath}.${key}` : key;
      if (pendingComments.length > 0) {
        descriptions[fullPath] = pendingComments.join(' ');
        pendingComments = [];
      }
    }
  }
  
  return { values, descriptions };
}

export function serializeSandboxVars(obj) {
  let lua = "SandboxVars = {\n";
  
  function serializeGroup(group, indent) {
    let content = "";
    for (const [key, val] of Object.entries(group)) {
      if (val !== null && typeof val === 'object') {
        content += `${indent}${key} = {\n`;
        content += serializeGroup(val, indent + "    ");
        content += `${indent}},\n`;
      } else {
        let formattedVal = val;
        if (typeof val === 'string') {
          formattedVal = `"${val}"`;
        } else if (typeof val === 'boolean') {
          formattedVal = val ? 'true' : 'false';
        }
        content += `${indent}${key} = ${formattedVal},\n`;
      }
    }
    return content;
  }

  lua += serializeGroup(obj, "    ");
  lua += "}\n";
  return lua;
}

export function parseSpawnRegions(content) {
  const result = [];
  const lines = content.split(/\r?\n/);
  for (let line of lines) {
    const cleanLine = line.trim();
    const match = cleanLine.match(/(?:--)?\s*\{\s*name\s*=\s*"([^"]+)"\s*(?:,\s*(file|serverfile)\s*=\s*"([^"]+)")?\s*\}/);
    if (match) {
      const name = match[1];
      const type = match[2];
      const filePath = match[3];
      const isCommented = cleanLine.startsWith('--');
      
      const region = { name, isCommented };
      if (type) {
        region[type] = filePath;
      }
      result.push(region);
    }
  }
  return result;
}

export function serializeSpawnRegions(regions) {
  let lua = "function SpawnRegions()\n\treturn {\n";
  for (const r of regions) {
    let line = `\t\t{ name = "${r.name}"`;
    if (r.file) {
      line += `, file = "${r.file}"`;
    } else if (r.serverfile) {
      line += `, serverfile = "${r.serverfile}"`;
    }
    line += " },";
    if (r.isCommented) {
      lua += `\t\t--${line.trim()}\n`;
    } else {
      lua += `${line}\n`;
    }
  }
  lua += "\t}\nend\n";
  return lua;
}
