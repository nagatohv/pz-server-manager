import 'dotenv/config';
import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';

import { authenticate, authenticateWS, generateToken, verifyPassword } from './auth.js';
import * as pzManager from './pz-manager.js';
import * as configManager from './config-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Servir frontend compilado de React (en producción)
const clientDistPath = fileURLToPath(new URL('../client/dist', import.meta.url));
app.use(express.static(clientDistPath));

// --- RUTAS DE API ---

// Login
app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Contraseña requerida' });
  }

  if (verifyPassword(password)) {
    const token = generateToken();
    return res.json({ token });
  } else {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }
});

// Verificar token
app.get('/api/auth/verify', authenticate, (req, res) => {
  res.json({ valid: true });
});

// Estado del Servidor
app.get('/api/status', authenticate, (req, res) => {
  res.json(pzManager.getStatus());
});

// Control del Servidor (iniciar, detener, forzar parada, actualizar)
app.post('/api/control', authenticate, (req, res) => {
  const { action, command } = req.body;

  switch (action) {
    case 'start': {
      const result = pzManager.startServer();
      if (result.error) return res.status(400).json(result);
      return res.json({ message: 'Servidor iniciándose...' });
    }
    case 'stop': {
      const result = pzManager.stopServer();
      if (result.error) return res.status(400).json(result);
      return res.json({ message: 'Deteniendo servidor de forma segura...' });
    }
    case 'kill': {
      const result = pzManager.killServer();
      if (result.error) return res.status(400).json(result);
      return res.json({ message: 'Servidor detenido forzosamente.' });
    }
    case 'update': {
      const { branch } = req.body;
      const result = pzManager.updateGame(branch);
      if (result.error) return res.status(400).json(result);
      return res.json({ message: 'Iniciando actualización del servidor...' });
    }
    case 'command': {
      if (!command) return res.status(400).json({ error: 'Comando requerido' });
      const result = pzManager.sendCommand(command);
      if (result.error) return res.status(400).json(result);
      return res.json({ message: 'Comando enviado con éxito.' });
    }
    default:
      return res.status(400).json({ error: 'Acción inválida' });
  }
});

// Obtener Ajustes Parseados de server.ini (para formularios)
app.get('/api/config/settings', authenticate, (req, res) => {
  try {
    const parsedIni = configManager.parseIniFile();
    // Convertir a un objeto clave-valor simple para el frontend
    const settings = {};
    parsedIni.forEach(item => {
      if (item.type === 'setting') {
        settings[item.key] = item.value;
      }
    });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Guardar Ajustes Parseados de server.ini
app.post('/api/config/settings', authenticate, (req, res) => {
  try {
    const result = configManager.saveIniSettings(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener Configuración propia del panel (Auto-Apagado por inactividad)
app.get('/api/config/panel', authenticate, (req, res) => {
  try {
    res.json(configManager.readPanelConfig());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Guardar Configuración propia del panel (Auto-Apagado por inactividad)
app.post('/api/config/panel', authenticate, (req, res) => {
  try {
    const cleanConfig = configManager.savePanelConfig(req.body);
    pzManager.setPanelConfig(cleanConfig);
    res.json({ success: true, config: cleanConfig });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener Contenido Crudo de un Archivo de Configuración
app.get('/api/config/raw/:type', authenticate, (req, res) => {
  const { type } = req.params;
  try {
    const content = configManager.readRawFile(type);
    res.json({ content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Guardar Contenido Crudo de un Archivo de Configuración
app.post('/api/config/raw/:type', authenticate, (req, res) => {
  const { type } = req.params;
  const { content } = req.body;
  if (content === undefined) {
    return res.status(400).json({ error: 'Contenido no provisto' });
  }

  try {
    const result = configManager.saveRawFile(type, content);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener Contenido Parseado (para GUI interactiva)
app.get('/api/config/parsed/:type', authenticate, (req, res) => {
  const { type } = req.params;
  try {
    const rawContent = configManager.readRawFile(type);
    if (!rawContent) {
      return res.json({ data: null });
    }
    
    let parsedData = null;
    if (type === 'sandbox') {
      parsedData = configManager.parseSandboxVars(rawContent);
    } else if (type === 'spawn') {
      parsedData = configManager.parseSpawnRegions(rawContent);
    } else if (type === 'ini') {
      parsedData = configManager.parseIniFileWithDescriptions();
    } else {
      return res.status(400).json({ error: 'Tipo de archivo no soportado para análisis GUI' });
    }
    res.json({ data: parsedData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Guardar Contenido Parseado desde GUI interactiva
app.post('/api/config/parsed/:type', authenticate, (req, res) => {
  const { type } = req.params;
  const { data } = req.body;
  if (data === undefined) {
    return res.status(400).json({ error: 'Datos no provistos' });
  }

  try {
    let rawContent = '';
    if (type === 'sandbox') {
      rawContent = configManager.serializeSandboxVars(data);
    } else if (type === 'spawn') {
      rawContent = configManager.serializeSpawnRegions(data);
    } else if (type === 'ini') {
      configManager.saveIniSettings(data);
      return res.json({ success: true });
    } else {
      return res.status(400).json({ error: 'Tipo de archivo no soportado para serialización GUI' });
    }

    const result = configManager.saveRawFile(type, rawContent);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Servir la app de React en cualquier ruta no controlada por la API (HTML5 routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// --- SERVIDOR WEBSOCKET ---
const wss = new WebSocketServer({ 
  noServer: true,
  path: '/ws'
});

// Integrar WebSocket con el servidor HTTP
server.on('upgrade', (request, socket, head) => {
  // Autenticar la conexión WS mediante auth.js
  authenticateWS({ req: request }, (isValid, code, message) => {
    if (!isValid) {
      socket.write(`HTTP/1.1 ${code} ${message}\r\n\r\n`);
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });
});

wss.on('connection', (ws) => {
  pzManager.registerClient(ws);

  ws.on('message', (message) => {
    try {
      const parsed = JSON.parse(message.toString());
      if (parsed.type === 'command' && parsed.data) {
        pzManager.sendCommand(parsed.data);
      }
    } catch (e) {
      // Ignorar mensajes mal formateados
    }
  });

  ws.on('close', () => {
    pzManager.unregisterClient(ws);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`PZ Web Portal corriendo en http://0.0.0.0:${PORT}`);
});
