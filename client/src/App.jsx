import React, { useState, useEffect, useRef } from 'react';

// Iconos SVG en línea para no depender de dependencias externas
const BiohazardIcon = () => (
  <svg className="biohazard-logo" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="M50,15 C45,15 41.5,18.5 41.5,23.5 C41.5,25.5 42,27.5 43,29 C34.5,31 29,38 29,46.5 C29,48.5 29.5,50.5 30,52 C27.5,50.5 24.5,49.5 21.5,49.5 C16.5,49.5 13,53 13,58 C13,60 13.5,62 14.5,63.5 C23,65.5 28.5,72.5 28.5,81 C28.5,83 28,85 27.5,86.5 C30,85 33,84 36,84 C41,84 44.5,87.5 44.5,92.5 C44.5,94.5 44,96.5 43,98 C51.5,96 57,89 57,80.5 C57,78.5 56.5,76.5 56,75 C58.5,76.5 61.5,77.5 64.5,77.5 C69.5,77.5 73,74 73,69 C73,67 72.5,65 71.5,63.5 C63,61.5 57.5,54.5 57.5,46 C57.5,44 58,42 58.5,40.5 C56,42 53,43 50,43 C45,43 41.5,39.5 41.5,34.5 C41.5,32.5 42,30.5 43,29 C50,15 50,15 50,15 Z" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="50" cy="50" r="8" fill="currentColor"/>
    <circle cx="50" cy="50" r="22" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="6,6"/>
  </svg>
);

const PlayIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
);

const StopIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/></svg>
);

const RestartIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
);

const UpdateIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
);

const KillIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10"/></svg>
);

const TerminalIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
);

const SettingsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
);

const PuzzleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4 9.3V5a2 2 0 0 1 2-2h4.3M20 9.3V5a2 2 0 0 0-2-2h-4.3M4 14.7V19a2 2 0 0 0 2 2h4.3M20 14.7V19a2 2 0 0 1-2 2h-4.3M8.3 12H4M20 12h-4.3"/></svg>
);

const FileIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
);

const LogoutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
);

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState('console');
  
  // Estados del Servidor
  const [statusData, setStatusData] = useState({
    status: 'STOPPED',
    stats: { cpu: 0, memory: 0 },
    config: { serverName: 'servertest', jvmMin: '4', jvmMax: '8' }
  });
  const [logs, setLogs] = useState([]);
  const [consoleInput, setConsoleInput] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  
  // Estados de Ajustes (Formulario)
  const [settings, setSettings] = useState({});
  const [saveMessage, setSaveMessage] = useState('');
  const [panelConfig, setPanelConfig] = useState({ idleShutdownMinutes: 0 });
  const [timeLeft, setTimeLeft] = useState(0);
  
  // Estados del Editor Avanzado
  const [rawEditorType, setRawEditorType] = useState('ini');
  const [rawContent, setRawContent] = useState('');
  const [rawMessage, setRawMessage] = useState('');

  // Estados de Mods
  const [newModId, setNewModId] = useState('');
  const [newWorkshopId, setNewWorkshopId] = useState('');

  // Refs para auto-scroll del terminal
  const terminalEndRef = useRef(null);
  const socketRef = useRef(null);

  // Helper para llamadas a la API
  const apiCall = async (url, method = 'GET', body = null) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };

    const config = {
      method,
      headers,
      ...(body ? { body: JSON.stringify(body) } : {})
    };

    try {
      const res = await fetch(url, config);
      if (res.status === 401 || res.status === 403) {
        handleLogout();
        throw new Error('Sesión expirada');
      }
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Algo salió mal');
      }
      return data;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  // Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
      } else {
        setLoginError(data.error || 'Contraseña incorrecta');
      }
    } catch (err) {
      setLoginError('Error de red al intentar ingresar.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    if (socketRef.current) {
      socketRef.current.close();
    }
  };

  // Cargar datos al cambiar a pestañas correspondientes
  useEffect(() => {
    if (!token) return;

    if (activeTab === 'config') {
      loadSettings();
    } else if (activeTab === 'editor') {
      loadRawContent(rawEditorType);
    } else if (activeTab === 'mods') {
      loadSettings(); // Los mods se configuran en el .ini
    }
  }, [activeTab, token]);

  useEffect(() => {
    if (!token) return;
    loadRawContent(rawEditorType);
  }, [rawEditorType, token]);

  // Temporizador local de apagado por inactividad
  useEffect(() => {
    if (statusData.idleShutdown && statusData.idleShutdown.expiresAt) {
      const expires = new Date(statusData.idleShutdown.expiresAt).getTime();
      const updateTimer = () => {
        const remaining = Math.max(0, Math.round((expires - Date.now()) / 1000));
        setTimeLeft(remaining);
      };
      updateTimer();
      const timer = setInterval(updateTimer, 1000);
      return () => clearInterval(timer);
    } else {
      setTimeLeft(0);
    }
  }, [statusData.idleShutdown]);

  const loadSettings = async () => {
    try {
      const data = await apiCall('/api/config/settings');
      setSettings(data);
      
      const panelData = await apiCall('/api/config/panel');
      setPanelConfig(panelData);
    } catch (err) {
      alert('Error al cargar configuraciones: ' + err.message);
    }
  };

  const saveSettings = async (e) => {
    if (e) e.preventDefault();
    setSaveMessage('');
    try {
      await apiCall('/api/config/settings', 'POST', settings);
      await apiCall('/api/config/panel', 'POST', panelConfig);
      setSaveMessage('✓ Configuración guardada correctamente.');
      setTimeout(() => setSaveMessage(''), 4000);
    } catch (err) {
      setSaveMessage('✗ Error al guardar: ' + err.message);
    }
  };

  const loadRawContent = async (type) => {
    try {
      const data = await apiCall(`/api/config/raw/${type}`);
      setRawContent(data.content || '');
    } catch (err) {
      alert('Error al cargar archivo crudo: ' + err.message);
    }
  };

  const saveRawContent = async () => {
    setRawMessage('');
    try {
      await apiCall(`/api/config/raw/${rawEditorType}`, 'POST', { content: rawContent });
      setRawMessage('✓ Archivo guardado correctamente.');
      setTimeout(() => setRawMessage(''), 4000);
    } catch (err) {
      setRawMessage('✗ Error al guardar: ' + err.message);
    }
  };

  // Conectar WebSocket para Logs y Estado
  useEffect(() => {
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?token=${token}`;
    
    const connectWS = () => {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
        console.log('WS Conectado');
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'log') {
          setLogs((prev) => [...prev, message.data].slice(-1000));
        } else if (message.type === 'logs_history') {
          setLogs(message.data);
        } else if (message.type === 'status_update') {
          setStatusData(message.data);
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        console.log('WS Desconectado, reintentando...');
        // Intentar reconectar en 3 segundos
        setTimeout(() => {
          if (localStorage.getItem('token')) {
            connectWS();
          }
        }, 3000);
      };

      ws.onerror = (err) => {
        console.error('WS Error:', err);
        ws.close();
      };
    };

    connectWS();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [token]);

  // Scroll al final del terminal al recibir nuevos logs
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Acciones de Control
  const handleControl = async (action) => {
    try {
      await apiCall('/api/control', 'POST', { action });
    } catch (err) {
      alert(`Error al ejecutar acción: ${err.message}`);
    }
  };

  // Enviar comando desde el prompt de consola
  const handleSendCommand = (e) => {
    e.preventDefault();
    if (!consoleInput.trim()) return;

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'command',
        data: consoleInput
      }));
      setConsoleInput('');
    } else {
      alert('WebSocket no está conectado actualmente. Intenta recargar.');
    }
  };

  // Agregar un Mod
  const handleAddMod = (e) => {
    e.preventDefault();
    if (!newModId.trim() || !newWorkshopId.trim()) return;

    // Obtener listas actuales de server.ini
    const currentMods = settings.Mods ? settings.Mods.split(';').filter(Boolean) : [];
    const currentItems = settings.WorkshopItems ? settings.WorkshopItems.split(';').filter(Boolean) : [];

    if (currentMods.includes(newModId.trim()) || currentItems.includes(newWorkshopId.trim())) {
      alert('El mod o ID de Workshop ya está agregado.');
      return;
    }

    currentMods.push(newModId.trim());
    currentItems.push(newWorkshopId.trim());

    const updatedSettings = {
      ...settings,
      Mods: currentMods.join(';'),
      WorkshopItems: currentItems.join(';')
    };

    setSettings(updatedSettings);
    setNewModId('');
    setNewWorkshopId('');
  };

  // Quitar un Mod
  const handleRemoveMod = (index) => {
    const currentMods = settings.Mods ? settings.Mods.split(';').filter(Boolean) : [];
    const currentItems = settings.WorkshopItems ? settings.WorkshopItems.split(';').filter(Boolean) : [];

    currentMods.splice(index, 1);
    currentItems.splice(index, 1);

    setSettings({
      ...settings,
      Mods: currentMods.join(';'),
      WorkshopItems: currentItems.join(';')
    });
  };

  // Carga de UI de login
  if (!token) {
    return (
      <div className="login-wrapper">
        <div className="login-card">
          <div className="login-logo-container">
            <BiohazardIcon />
            <h2>PZ Portal Admin</h2>
            <p>Acceso seguro para el control del servidor de Project Zomboid</p>
          </div>
          <form className="login-form" onSubmit={handleLogin}>
            {loginError && <div className="login-alert">{loginError}</div>}
            <div className="form-group">
              <label htmlFor="login-pass">Contraseña del Portal</label>
              <input
                id="login-pass"
                type="password"
                className="form-control"
                placeholder="Ingresa la contraseña maestra..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center' }}>
              Autenticar Acceso
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Obtener lista estructurada de mods actuales
  const listMods = settings.Mods ? settings.Mods.split(';').filter(Boolean) : [];
  const listItems = settings.WorkshopItems ? settings.WorkshopItems.split(';').filter(Boolean) : [];

  return (
    <div className="app-container">
      {/* HEADER */}
      <header className="header">
        <div className="brand-section">
          <BiohazardIcon />
          <div className="brand-title">
            <h1>PZ ADMIN</h1>
            <p>Servidor: {statusData.config.serverName}</p>
          </div>
        </div>
        
        <div className="header-actions">
          {timeLeft > 0 && (
            <div className="status-badge updating" style={{ animation: 'pulse-border 1.5s infinite', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--state-crashed)', borderColor: 'rgba(239, 68, 68, 0.25)' }}>
              ⚠️ APAGADO EN {Math.floor(timeLeft / 60)}M {timeLeft % 60}S
            </div>
          )}
          <div className={`status-badge ${statusData.status.toLowerCase()}`}>
            <span className="status-dot"></span>
            {statusData.status}
          </div>
          <button className="btn btn-secondary" onClick={handleLogout} style={{ padding: '0.5rem 0.8rem', fontSize: '0.8rem' }}>
            <LogoutIcon /> Salir
          </button>
        </div>
      </header>

      {/* METRICAS Y RECURSOS */}
      <section className="resources-grid">
        <div className="resource-card">
          <div className="resource-icon">
            {/* SVG CPU */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 15h3M1 9h3M1 15h3"/></svg>
          </div>
          <div className="resource-info">
            <span className="resource-label">CPU Proceso</span>
            <span className="resource-value">{statusData.stats.cpu || 'Inactivo'}</span>
            <span className="resource-subtext">Asignado al hilo Java</span>
          </div>
        </div>

        <div className="resource-card">
          <div className="resource-icon">
            {/* SVG Memoria */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 3v18M3 12h18"/></svg>
          </div>
          <div className="resource-info">
            <span className="resource-label">Memoria Usada</span>
            <span className="resource-value">
              {statusData.status === 'RUNNING' ? `${statusData.stats.memory} MB` : '0 MB'}
            </span>
            <span className="resource-subtext">Límite JVM: {statusData.config.jvmMin}G - {statusData.config.jvmMax}G</span>
          </div>
        </div>

        <div className="resource-card">
          <div className="resource-icon">
            {/* SVG Jugadores */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div className="resource-info">
            <span className="resource-label">Jugadores Activos</span>
            <span className="resource-value">
              {statusData.status === 'RUNNING' ? `${statusData.onlinePlayers || 0}` : '0'}
            </span>
            <span className="resource-subtext">Online en el servidor</span>
          </div>
        </div>

        <div className="resource-card">
          <div className="resource-icon">
            {/* SVG Reloj/Auto-Apagado */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div className="resource-info">
            <span className="resource-label">Auto-Apagado</span>
            <span className="resource-value">
              {timeLeft > 0 ? `${Math.floor(timeLeft / 60)}m ${timeLeft % 60}s` : (panelConfig.idleShutdownMinutes > 0 ? 'Activo' : 'Inactivo')}
            </span>
            <span className="resource-subtext">
              {timeLeft > 0 ? 'Cuenta regresiva iniciada' : `Límite: ${panelConfig.idleShutdownMinutes || 0} min`}
            </span>
          </div>
        </div>
      </section>

      {/* PESTAÑAS */}
      <nav className="tabs-container">
        <button className={`tab-btn ${activeTab === 'console' ? 'active' : ''}`} onClick={() => setActiveTab('console')}>
          <TerminalIcon /> Consola y Control
        </button>
        <button className={`tab-btn ${activeTab === 'config' ? 'active' : ''}`} onClick={() => setActiveTab('config')}>
          <SettingsIcon /> Parámetros Principales
        </button>
        <button className={`tab-btn ${activeTab === 'mods' ? 'active' : ''}`} onClick={() => setActiveTab('mods')}>
          <PuzzleIcon /> Gestión de Mods
        </button>
        <button className={`tab-btn ${activeTab === 'editor' ? 'active' : ''}`} onClick={() => setActiveTab('editor')}>
          <FileIcon /> Editor Avanzado
        </button>
      </nav>

      {/* CONTENIDO DE PESTAÑA */}
      <main className="main-content">
        {activeTab === 'console' && (
          <div className="control-panel">
            <div className="action-buttons">
              <button 
                className="btn btn-primary"
                onClick={() => handleControl('start')}
                disabled={statusData.status === 'RUNNING' || statusData.status === 'STARTING' || statusData.status === 'UPDATING'}
              >
                <PlayIcon /> Iniciar Servidor
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => handleControl('stop')}
                disabled={statusData.status !== 'RUNNING'}
              >
                <StopIcon /> Detener Seguro
              </button>
              <button 
                className="btn btn-purple"
                onClick={() => handleControl('update')}
                disabled={statusData.status === 'RUNNING' || statusData.status === 'STARTING' || statusData.status === 'UPDATING'}
              >
                <UpdateIcon /> Actualizar Juego (SteamCMD)
              </button>
              <button 
                className="btn btn-danger"
                onClick={() => handleControl('kill')}
                disabled={statusData.status === 'STOPPED'}
              >
                <KillIcon /> Forzar Parada (SIGKILL)
              </button>
            </div>

            <div className="terminal">
              <div className="terminal-header">
                <div className="terminal-dots">
                  <span className="terminal-dot red"></span>
                  <span className="terminal-dot yellow"></span>
                  <span className="terminal-dot green"></span>
                </div>
                <div className="terminal-title">STDOUT/STDERR - CONSOLA DE EVENTOS</div>
                <div>Líneas en buffer: {logs.length}</div>
              </div>
              <div className="terminal-body">
                {logs.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No hay eventos registrados en la consola. Inicia el servidor o haz un update...
                  </div>
                ) : (
                  logs.map((log, idx) => {
                    let logType = 'info';
                    if (log.toLowerCase().includes('err') || log.includes('[STDERR]')) logType = 'error';
                    else if (log.toLowerCase().includes('warn')) logType = 'warn';
                    else if (log.toLowerCase().includes('success') || log.includes('ready') || log.includes('ready for connections')) logType = 'success';
                    return (
                      <div key={idx} className={`log-line ${logType}`}>
                        {log}
                      </div>
                    );
                  })
                )}
                <div ref={terminalEndRef} />
              </div>
              <form className="terminal-input-container" onSubmit={handleSendCommand}>
                <span className="terminal-prompt">&gt;</span>
                <input
                  type="text"
                  className="terminal-input"
                  placeholder="Escribe un comando para la consola (ej. broadcast ¡Guardando servidor!...)"
                  value={consoleInput}
                  onChange={(e) => setConsoleInput(e.target.value)}
                  disabled={statusData.status !== 'RUNNING' && statusData.status !== 'STARTING'}
                />
              </form>
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
            {/* Widget de Control de Energía redundante */}
            <div style={{ background: 'rgba(15, 23, 42, 0.3)', border: '1px solid var(--border-color)', padding: '1.5rem', borderRadius: '12px' }}>
              <h3 style={{ fontFamily: 'var(--font-header)', fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--primary)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                Acciones de Energía del Servidor
              </h3>
              <div className="action-buttons">
                <button 
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleControl('start')}
                  disabled={statusData.status === 'RUNNING' || statusData.status === 'STARTING' || statusData.status === 'UPDATING'}
                >
                  <PlayIcon /> Iniciar Servidor
                </button>
                <button 
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleControl('stop')}
                  disabled={statusData.status !== 'RUNNING'}
                >
                  <StopIcon /> Detener Seguro
                </button>
                <button 
                  type="button"
                  className="btn btn-purple"
                  onClick={() => handleControl('update')}
                  disabled={statusData.status === 'RUNNING' || statusData.status === 'STARTING' || statusData.status === 'UPDATING'}
                >
                  <UpdateIcon /> Actualizar Juego (SteamCMD)
                </button>
                <button 
                  type="button"
                  className="btn btn-danger"
                  onClick={() => handleControl('kill')}
                  disabled={statusData.status === 'STOPPED'}
                >
                  <KillIcon /> Forzar Parada (SIGKILL)
                </button>
              </div>
            </div>

            <form className="config-form" onSubmit={saveSettings}>
            <div className="form-group">
              <label>Máximo de Jugadores (MaxPlayers)</label>
              <input
                type="number"
                className="form-control"
                value={settings.MaxPlayers || ''}
                onChange={(e) => setSettings({ ...settings, MaxPlayers: e.target.value })}
              />
              <span className="form-description">Número de slots permitidos.</span>
            </div>

            <div className="form-group">
              <label>Contraseña del Servidor (Password)</label>
              <input
                type="text"
                className="form-control"
                value={settings.Password || ''}
                onChange={(e) => setSettings({ ...settings, Password: e.target.value })}
                placeholder="Vacio para acceso libre"
              />
              <span className="form-description">Requerida para unirse al servidor de juego.</span>
            </div>

            <div className="form-group">
              <label>Puerto Principal del Servidor (Port)</label>
              <input
                type="number"
                className="form-control"
                value={settings.Port || ''}
                onChange={(e) => setSettings({ ...settings, Port: e.target.value })}
              />
              <span className="form-description">Por defecto 16261 (Puerto UDP).</span>
            </div>

            <div className="form-group">
              <label>Servidor Público (Public)</label>
              <select
                className="form-control"
                value={settings.Public || 'false'}
                onChange={(e) => setSettings({ ...settings, Public: e.target.value })}
              >
                <option value="true">Sí (Aparecer en el listado público de Steam)</option>
                <option value="false">No (Servidor oculto, conexión directa)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Puerto RCON (RCONPort)</label>
              <input
                type="number"
                className="form-control"
                value={settings.RCONPort || ''}
                onChange={(e) => setSettings({ ...settings, RCONPort: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Contraseña RCON (RCONPassword)</label>
              <input
                type="text"
                className="form-control"
                value={settings.RCONPassword || ''}
                onChange={(e) => setSettings({ ...settings, RCONPassword: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Pausar cuando esté vacío (PauseWhenEmpty)</label>
              <select
                className="form-control"
                value={settings.PauseWhenEmpty || 'true'}
                onChange={(e) => setSettings({ ...settings, PauseWhenEmpty: e.target.value })}
              >
                <option value="true">Sí (Pausa el tiempo del juego si nadie juega)</option>
                <option value="false">No (El mundo sigue vivo 24/7)</option>
              </select>
            </div>

            <div className="form-group">
              <label>PVP Habilitado</label>
              <select
                className="form-control"
                value={settings.PVP || 'true'}
                onChange={(e) => setSettings({ ...settings, PVP: e.target.value })}
              >
                <option value="true">Habilitado (Jugadores pueden dañarse)</option>
                <option value="false">Deshabilitado (Solo Cooperativo PVE)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Auto-Apagado por Inactividad (Minutos)</label>
              <input
                type="number"
                min="0"
                className="form-control"
                value={panelConfig.idleShutdownMinutes}
                onChange={(e) => setPanelConfig({ ...panelConfig, idleShutdownMinutes: Math.max(0, parseInt(e.target.value, 10) || 0) })}
              />
              <span className="form-description">Apaga el servidor tras este tiempo sin jugadores online. Usa 0 para desactivar.</span>
            </div>

            <div className="form-group full-width" style={{ flexDirection: 'row', alignItems: 'center', gap: '1.5rem', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary">
                Guardar Parámetros
              </button>
              {saveMessage && <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{saveMessage}</span>}
            </div>
          </form>
          </div>
        )}

        {activeTab === 'mods' && (
          <div className="mods-panel">
            <form className="mod-adder" onSubmit={handleAddMod}>
              <h3>Añadir Mod de Steam Workshop</h3>
              <div className="form-group">
                <label>Nombre del Mod (ID Mod)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej: Tsukibako"
                  value={newModId}
                  onChange={(e) => setNewModId(e.target.value)}
                  required
                />
                <span className="form-description">El ID de mod tal como figura en los archivos del mod.</span>
              </div>
              <div className="form-group">
                <label>Workshop Item ID</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="Ej: 2901962947"
                  value={newWorkshopId}
                  onChange={(e) => setNewWorkshopId(e.target.value)}
                  required
                />
                <span className="form-description">El ID numérico del item de Workshop de Steam.</span>
              </div>
              <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center' }}>
                Agregar a la Lista
              </button>
            </form>

            <div className="mods-lists">
              <div className="list-container">
                <div className="list-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Mods Instalados ({listMods.length})</span>
                  <button className="btn btn-secondary" onClick={() => saveSettings()} style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
                    Guardar Cambios de Mods
                  </button>
                </div>
                {saveMessage && <p style={{ fontSize: '0.8rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>{saveMessage}</p>}
                
                {listMods.length === 0 ? (
                  <div className="empty-list-placeholder">No hay mods agregados actualmente.</div>
                ) : (
                  <div className="mod-tags">
                    {listMods.map((mod, index) => (
                      <div className="mod-tag" key={index}>
                        <span><strong>{mod}</strong> ({listItems[index] || 'Sin ID'})</span>
                        <button type="button" onClick={() => handleRemoveMod(index)} title="Remover Mod">×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'editor' && (
          <div className="editor-layout">
            <div className="editor-header-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="editor-selector">
                <button 
                  className={`editor-selector-btn ${rawEditorType === 'ini' ? 'active' : ''}`}
                  onClick={() => setRawEditorType('ini')}
                >
                  {statusData.config.serverName}.ini
                </button>
                <button 
                  className={`editor-selector-btn ${rawEditorType === 'sandbox' ? 'active' : ''}`}
                  onClick={() => setRawEditorType('sandbox')}
                >
                  {statusData.config.serverName}_SandboxVars.lua
                </button>
                <button 
                  className={`editor-selector-btn ${rawEditorType === 'spawn' ? 'active' : ''}`}
                  onClick={() => setRawEditorType('spawn')}
                >
                  {statusData.config.serverName}_spawnregions.lua
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {rawMessage && <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{rawMessage}</span>}
                <button className="btn btn-primary" onClick={saveRawContent} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                  Guardar Archivo Crudo
                </button>
              </div>
            </div>
            
            <textarea
              className="raw-textarea"
              value={rawContent}
              onChange={(e) => setRawContent(e.target.value)}
              placeholder="Cargando configuración... (Si el archivo está vacío, el servidor aún no lo ha generado o puedes escribir su contenido y guardarlo aquí)."
            />
          </div>
        )}
      </main>
    </div>
  );
}
