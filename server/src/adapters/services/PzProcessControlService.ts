import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import IServerControlService from '../../domain/ports/IServerControlService.js';
import { SERVER_STRINGS } from '../../config/strings.js';
import { SERVER_CONSTANTS } from '../../config/constants.js';
import {
  ServerStatus,
  ObserverEventType
} from '../../types.js';
import type {
  ControlResult,
  ServerStatusPayload,
  ProcessObserver,
  PanelConfig,
  ISystemConfig
} from '../../types.js';
import type IConfigRepository from '../../domain/ports/IConfigRepository.js';

/** Status values that block a new start. */
const ACTIVE_STATUSES: ReadonlySet<ServerStatus> = new Set([
  ServerStatus.Running,
  ServerStatus.Starting,
  ServerStatus.Updating
]);

/** Status values that indicate the server is not stoppable. */
const INACTIVE_STATUSES: ReadonlySet<ServerStatus> = new Set([
  ServerStatus.Stopped,
  ServerStatus.Crashed
]);

/** Status values that allow stdin commands. */
const COMMANDABLE_STATUSES: ReadonlySet<ServerStatus> = new Set([
  ServerStatus.Running,
  ServerStatus.Starting
]);

/** Timeout (ms) before force-killing on stop. */
const STOP_GRACE_PERIOD_MS = 45_000;
/** Delay (ms) between save and quit on graceful stop. */
const SAVE_QUIT_DELAY_MS = 5_000;
/** Delay (ms) before querying player count after connect/disconnect. */
const PLAYER_EVENT_QUERY_DELAY_MS = 2_500;
/** Standard Linux page size in bytes. */
const LINUX_PAGE_SIZE = 4_096;
/** CLK_TCK default value on Linux. */
const CLK_TCK = 100;

/**
 * Service implementing IServerControlService as a Singleton.
 * Orchestrates the OS process lifecycle of the Project Zomboid dedicated server.
 * Implements the Observer pattern to notify subscribers of logs and status changes.
 */
class PzProcessControlService implements IServerControlService {
  private systemConfig: ISystemConfig;
  private configRepository: IConfigRepository;

  // Process state variables
  private pzProcess: ChildProcess | null = null;
  private pzStatus: ServerStatus = ServerStatus.Stopped;
  private steamCmdProcess: ChildProcess | null = null;
  
  // Log buffers
  private logBuffer: string[] = [];
  
  // Server attributes
  private installedBranch: string = '';
  private onlinePlayerCount: number = 0;

  // Resource stats cache
  private cachedCpuPercent: number = 0;
  private cachedMemMb: number = 0;
  private lastCpuTicks: number = 0;
  private lastCpuTime: number = Date.now();

  // Inactivity Shutdown properties
  private idleShutdownMinutes: number = 0;
  private idleShutdownTimer: NodeJS.Timeout | null = null;
  private idleShutdownExpiresAt: number | null = null;
  private playerQueryInterval: NodeJS.Timeout | null = null;
  private monitorInterval: NodeJS.Timeout | null = null;

  // Observer Pattern list
  private observers: Set<ProcessObserver> = new Set();

  constructor(systemConfig: ISystemConfig, configRepository: IConfigRepository) {
    this.systemConfig = systemConfig;
    this.configRepository = configRepository;

    this.initInstalledBranch();
    this.loadIdleShutdownConfig();
  }

  /**
   * Reads initial installed branch from disk.
   */
  private initInstalledBranch(): void {
    const branchFile = path.join(this.systemConfig.DATA_DIR, SERVER_CONSTANTS.PATH_INSTALLED_BRANCH);
    try {
      if (fs.existsSync(branchFile)) {
        this.installedBranch = fs.readFileSync(branchFile, 'utf8').trim();
      }
    } catch (err) {
      // Ignore initial file read errors
    }
  }

  /**
   * Load inactivity shutdown minutes config.
   */
  private loadIdleShutdownConfig(): void {
    try {
      const panelConfig = this.configRepository.readPanelConfig();
      this.idleShutdownMinutes = panelConfig.idleShutdownMinutes || 0;
    } catch (err) {
      // Ignore initial config errors
    }
  }

  // --- Observer Pattern Implementation ---

  subscribe(observer: ProcessObserver): void {
    this.observers.add(observer);
    // Send historical logs and initial status
    if (typeof observer.onLogHistory === 'function') {
      observer.onLogHistory(this.logBuffer);
    }
    if (typeof observer.onStatusUpdate === 'function') {
      observer.onStatusUpdate(this.getStatus());
    }
  }

  unsubscribe(observer: ProcessObserver): void {
    this.observers.delete(observer);
  }

  private notifyObservers(type: ObserverEventType, data: string | ServerStatusPayload): void {
    for (const obs of this.observers) {
      try {
        if (type === ObserverEventType.Log && typeof obs.onLog === 'function') {
          obs.onLog(data as string);
        } else if (type === ObserverEventType.StatusUpdate && typeof obs.onStatusUpdate === 'function') {
          obs.onStatusUpdate(data as ServerStatusPayload);
        }
      } catch (err) {
        // Silent error to prevent one broken observer from halting notifications
      }
    }
  }

  private appendLog(line: string): void {
    const logLine = `[${new Date().toISOString()}] ${line}`;
    this.logBuffer.push(logLine);
    if (this.logBuffer.length > SERVER_CONSTANTS.MAX_LOG_BUFFER_SIZE) {
      this.logBuffer.shift();
    }
    this.notifyObservers(ObserverEventType.Log, logLine);
  }

  private broadcastStatus(): void {
    this.notifyObservers(ObserverEventType.StatusUpdate, this.getStatus());
  }

  // --- Resource Statistics Engine ---

  private findZomboidPid(): number | null {
    if (process.platform !== SERVER_CONSTANTS.PLATFORM_LINUX) return null;
    try {
      const files = fs.readdirSync(SERVER_CONSTANTS.PATH_PROC);
      for (const file of files) {
        if (/^\d+$/.test(file)) {
          try {
            const cmdline = fs.readFileSync(`/proc/${file}/cmdline`, 'utf8');
            if (cmdline.includes('zombie.network.GameServer') || cmdline.includes('ProjectZomboid64')) {
              return parseInt(file, 10);
            }
          } catch (e) {
            // Ignore closed process read errors
          }
        }
      }
    } catch (err) {
      // Ignore /proc read errors
    }
    return null;
  }

  private updateResourceStats(): void {
    if (this.pzStatus !== ServerStatus.Running) {
      this.cachedCpuPercent = 0;
      this.cachedMemMb = 0;
      this.lastCpuTicks = 0;
      return;
    }

    const pid = this.findZomboidPid();
    if (!pid) {
      this.cachedCpuPercent = 0;
      this.cachedMemMb = 0;
      return;
    }

    try {
      const statContent = fs.readFileSync(`${SERVER_CONSTANTS.PATH_PROC}/${pid}/stat`, 'utf8');
      const parts = statContent.split(' ');
      const utime = parseInt(parts[13], 10);
      const stime = parseInt(parts[14], 10);
      const rss = parseInt(parts[23], 10);
      
      this.cachedMemMb = Math.round((rss * LINUX_PAGE_SIZE) / (1024 * 1024));

      const totalTicks = utime + stime;
      const now = Date.now();
      const timeDelta = (now - this.lastCpuTime) / 1000;

      if (this.lastCpuTicks > 0 && timeDelta > 0) {
        const tickDelta = totalTicks - this.lastCpuTicks;
        const cpuSeconds = tickDelta / CLK_TCK;
        const numCores = os.cpus().length || 1;
        const percent = (cpuSeconds / timeDelta) * 100;
        
        this.cachedCpuPercent = parseFloat((percent / numCores).toFixed(1));
        
        if (this.cachedCpuPercent < 0) this.cachedCpuPercent = 0;
        if (this.cachedCpuPercent > 100) this.cachedCpuPercent = 100;
      }

      this.lastCpuTicks = totalTicks;
      this.lastCpuTime = now;
    } catch (err) {
      this.cachedCpuPercent = 0;
      this.cachedMemMb = 0;
      this.lastCpuTicks = 0;
    }
  }

  // --- Helpers ---

  /** Clears all running intervals/timers and resets runtime counters. */
  private clearAllTimers(): void {
    if (this.playerQueryInterval) { clearInterval(this.playerQueryInterval); this.playerQueryInterval = null; }
    if (this.idleShutdownTimer)   { clearTimeout(this.idleShutdownTimer);   this.idleShutdownTimer = null; }
    if (this.monitorInterval)     { clearInterval(this.monitorInterval);     this.monitorInterval = null; }
    this.idleShutdownExpiresAt = null;
  }

  /** Resets volatile counters to their default values. */
  private resetCounters(): void {
    this.onlinePlayerCount = 0;
    this.cachedCpuPercent = 0;
    this.cachedMemMb = 0;
    this.lastCpuTicks = 0;
    this.lastCpuTime = Date.now();
  }

  // --- IServerControlService Port Methods ---

  getStatus(): ServerStatusPayload {
    const stats = { cpu: 0, memory: 0 };
    if (this.pzStatus === ServerStatus.Running) {
      stats.cpu = this.cachedCpuPercent;
      stats.memory = this.cachedMemMb;
    }

    return {
      status: this.pzStatus,
      stats,
      onlinePlayers: this.onlinePlayerCount,
      idleShutdown: {
        minutes: this.idleShutdownMinutes,
        expiresAt: this.idleShutdownExpiresAt,
        timeRemaining: this.idleShutdownExpiresAt ? Math.max(0, Math.round((this.idleShutdownExpiresAt - Date.now()) / 1000)) : 0
      },
      config: {
        serverName: this.systemConfig.SERVER_NAME,
        jvmMin: this.systemConfig.JVM_MIN_GB,
        jvmMax: this.systemConfig.JVM_MAX_GB,
        installedBranch: this.installedBranch
      }
    };
  }

  private configureMemory(): void {
    const jsonPath = path.join(this.systemConfig.PZ_SERVER_DIR, SERVER_CONSTANTS.PATH_CONFIG_JSON);
    if (!fs.existsSync(jsonPath)) {
      this.appendLog(SERVER_STRINGS.MSG_JSON_CONFIG_MISSING.replace('{path}', jsonPath));
      return;
    }

    // Read language setting from panel config
    let serverLang = 'es';
    try {
      const panelConfig = this.configRepository.readPanelConfig();
      serverLang = panelConfig.serverLanguage || 'es';
    } catch (err) {
      // Ignore panel config read errors
    }

    try {
      const rawData = fs.readFileSync(jsonPath, 'utf8');
      const config = JSON.parse(rawData) as { vmArgs?: string[] };

      if (config.vmArgs) {
        config.vmArgs = config.vmArgs.filter((arg: string) => 
          !arg.startsWith(SERVER_CONSTANTS.JVM_ARG_MAX_MEM_PREFIX) && 
          !arg.startsWith(SERVER_CONSTANTS.JVM_ARG_MIN_MEM_PREFIX) && 
          !arg.startsWith(SERVER_CONSTANTS.JVM_ARG_LANG_PREFIX)
        );
        config.vmArgs.push(`${SERVER_CONSTANTS.JVM_ARG_MIN_MEM_PREFIX}${this.systemConfig.JVM_MIN_GB}g`);
        config.vmArgs.push(`${SERVER_CONSTANTS.JVM_ARG_MAX_MEM_PREFIX}${this.systemConfig.JVM_MAX_GB}g`);
        config.vmArgs.push(`${SERVER_CONSTANTS.JVM_ARG_LANG_PREFIX}${serverLang}`);

        fs.writeFileSync(jsonPath, JSON.stringify(config, null, 4), 'utf8');
        this.appendLog(
          SERVER_STRINGS.MSG_JVM_CONFIGURED
            .replace('{min}', String(this.systemConfig.JVM_MIN_GB))
            .replace('{max}', String(this.systemConfig.JVM_MAX_GB))
            .replace('{lang}', serverLang.toUpperCase())
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.appendLog(SERVER_STRINGS.ERR_SAVE_FILE_FAILED.replace('{type}', 'ProjectZomboid64.json').replace('{message}', message));
    }
  }

  startServer(): ControlResult {
    if (ACTIVE_STATUSES.has(this.pzStatus)) {
      return { error: SERVER_STRINGS.ERR_SERVER_ALREADY_RUNNING };
    }

    const scriptPath = path.join(this.systemConfig.PZ_SERVER_DIR, SERVER_CONSTANTS.PATH_START_SCRIPT);
    if (!fs.existsSync(scriptPath)) {
      return { error: SERVER_STRINGS.ERR_START_SCRIPT_NOT_FOUND.replace('{path}', scriptPath) };
    }

    this.pzStatus = ServerStatus.Starting;
    
    // Clear timers
    this.clearAllTimers();
    this.resetCounters();

    this.broadcastStatus();
    this.appendLog(SERVER_STRINGS.MSG_STARTING_SERVER);

    this.configureMemory();

    if (!fs.existsSync(this.systemConfig.ZO_USER_DIR)) {
      fs.mkdirSync(this.systemConfig.ZO_USER_DIR, { recursive: true });
    }

    const binaryPath = path.join(this.systemConfig.PZ_SERVER_DIR, SERVER_CONSTANTS.PATH_BINARY_PZ);
    if (!fs.existsSync(binaryPath)) {
      return { error: SERVER_STRINGS.ERR_BINARY_NOT_FOUND.replace('{path}', binaryPath) };
    }

    const env = {
      ...process.env,
      PATH: `${path.join(this.systemConfig.PZ_SERVER_DIR, SERVER_CONSTANTS.ENV_JRE_BIN)}:${process.env.PATH || ''}`,
      LD_LIBRARY_PATH: `${path.join(this.systemConfig.PZ_SERVER_DIR, SERVER_CONSTANTS.ENV_LINUX64)}:${path.join(this.systemConfig.PZ_SERVER_DIR, SERVER_CONSTANTS.ENV_NATIVES)}:${this.systemConfig.PZ_SERVER_DIR}:${path.join(this.systemConfig.PZ_SERVER_DIR, SERVER_CONSTANTS.ENV_JRE_LIB)}:${process.env.LD_LIBRARY_PATH || ''}`,
      LD_PRELOAD: process.env.LD_PRELOAD ? `${process.env.LD_PRELOAD}:${SERVER_CONSTANTS.ENV_JSIG}` : SERVER_CONSTANTS.ENV_JSIG
    };

    this.pzProcess = spawn(binaryPath, [
      '-cachedir=' + this.systemConfig.ZO_USER_DIR,
      '-servername', this.systemConfig.SERVER_NAME,
      '-adminpassword', this.systemConfig.ADMIN_PASSWORD
    ], {
      cwd: this.systemConfig.PZ_SERVER_DIR,
      env
    });

    if (this.pzProcess.stdout) {
      this.pzProcess.stdout.on('data', (data: Buffer) => {
        const text = data.toString();
        const lines = text.split('\n');
        lines.forEach((line: string) => {
          if (line.trim()) {
            this.appendLog(line);

            // Parse player count connected logs
            const match = line.match(/(?:Players connected|Players)\s*\((\d+)\)/i);
            if (match) {
              const count = parseInt(match[1], 10);
              this.updatePlayerCount(count);
            }

            // Trigger player count check on client connect/disconnect
            if (line.includes(' connected') && line.includes('user ')) {
              setTimeout(() => this.queryPlayerCount(), PLAYER_EVENT_QUERY_DELAY_MS);
            }
            if (line.includes(' disconnected') && line.includes('user ')) {
              setTimeout(() => this.queryPlayerCount(), PLAYER_EVENT_QUERY_DELAY_MS);
            }

            // Detect server startup complete (case-insensitive check)
            const lowerLine = line.toLowerCase();
            if (this.pzStatus === ServerStatus.Starting && (
              lowerLine.includes('zomboid server is running') || 
              lowerLine.includes('raknet startup') || 
              lowerLine.includes('server started') ||
              lowerLine.includes('reborn')
            )) {
              this.pzStatus = ServerStatus.Running;
              this.broadcastStatus();
              this.appendLog(SERVER_STRINGS.MSG_SERVER_ONLINE);
              
              if (this.playerQueryInterval) clearInterval(this.playerQueryInterval);
              this.playerQueryInterval = setInterval(() => this.queryPlayerCount(), SERVER_CONSTANTS.PLAYER_COUNT_QUERY_INTERVAL_MS);
              this.queryPlayerCount();

              if (this.monitorInterval) clearInterval(this.monitorInterval);
              this.lastCpuTicks = 0;
              this.lastCpuTime = Date.now();
              this.monitorInterval = setInterval(() => this.updateResourceStats(), SERVER_CONSTANTS.RESOURCE_MONITOR_INTERVAL_MS);
            }
          }
        });
      });
    }

    if (this.pzProcess.stderr) {
      this.pzProcess.stderr.on('data', (data: Buffer) => {
        const text = data.toString();
        const lines = text.split('\n');
        lines.forEach((line: string) => {
          if (line.trim()) {
            this.appendLog(`[STDERR] ${line}`);
          }
        });
      });
    }

    this.pzProcess.on('exit', (code: number | null, signal: string | null) => {
      this.appendLog(
        SERVER_STRINGS.MSG_SERVER_EXIT
          .replace('{code}', String(code))
          .replace('{signal}', String(signal))
      );
      
      if (this.pzStatus === ServerStatus.Running || this.pzStatus === ServerStatus.Starting) {
        this.pzStatus = ServerStatus.Crashed;
      } else {
        this.pzStatus = ServerStatus.Stopped;
      }
      
      this.pzProcess = null;
      this.clearAllTimers();
      this.resetCounters();
      this.broadcastStatus();
    });

    return { success: true };
  }

  stopServer(): ControlResult {
    if (INACTIVE_STATUSES.has(this.pzStatus)) {
      return { error: SERVER_STRINGS.ERR_SERVER_ALREADY_STOPPED };
    }
    if (this.pzStatus === ServerStatus.Updating) {
      return { error: SERVER_STRINGS.ERR_STOP_WHILE_UPDATING };
    }

    this.appendLog(SERVER_STRINGS.MSG_STOPPING_SERVER);
    this.pzStatus = ServerStatus.Stopping;
    
    this.clearAllTimers();
    this.resetCounters();
    this.broadcastStatus();

    // Write safe shutdown commands to process stdin
    if (this.pzProcess && this.pzProcess.stdin) {
      this.appendLog('[Admin Input] > save');
      try {
        this.pzProcess.stdin.write(SERVER_CONSTANTS.CMD_SAVE);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.appendLog(`[Manager] Error al enviar comando save: ${message}`);
      }
    }
    
    setTimeout(() => {
      if (this.pzProcess && this.pzProcess.stdin) {
        this.appendLog('[Admin Input] > quit');
        try {
          this.pzProcess.stdin.write(SERVER_CONSTANTS.CMD_QUIT);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          this.appendLog(`[Manager] Error al enviar comando quit: ${message}`);
        }
      }
    }, SAVE_QUIT_DELAY_MS);

    // Safety timeout to force SIGKILL if shutdown hangs
    setTimeout(() => {
      const javaPid = this.findZomboidPid();
      if (this.pzProcess || javaPid) {
        this.appendLog(SERVER_STRINGS.MSG_FORCE_STOPPING_SERVER);
        if (javaPid) {
          try { process.kill(javaPid, SERVER_CONSTANTS.SIGNAL_SIGKILL); } catch (e) { /* ignored */ }
        }
        if (this.pzProcess) {
          try { this.pzProcess.kill(SERVER_CONSTANTS.SIGNAL_SIGKILL); } catch (e) { /* ignored */ }
        }
        this.pzStatus = ServerStatus.Stopped;
        this.pzProcess = null;
        this.broadcastStatus();
      }
    }, STOP_GRACE_PERIOD_MS);

    return { success: true };
  }

  killServer(): ControlResult {
    const javaPid = this.findZomboidPid();
    if (!this.pzProcess && !javaPid) {
      return { error: SERVER_STRINGS.ERR_NO_ACTIVE_PROCESS };
    }

    this.appendLog(SERVER_STRINGS.MSG_FORCE_STOP_SIGKILL);
    
    if (javaPid) {
      this.appendLog(SERVER_STRINGS.MSG_SIGKILL_JAVA.replace('{pid}', String(javaPid)));
      try {
        process.kill(javaPid, SERVER_CONSTANTS.SIGNAL_SIGKILL);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.appendLog(`[Manager] Error al matar PID de Java: ${message}`);
      }
    }

    if (this.pzProcess) {
      this.appendLog(SERVER_STRINGS.MSG_SIGKILL_SPAWN.replace('{pid}', String(this.pzProcess.pid)));
      try {
        this.pzProcess.kill(SERVER_CONSTANTS.SIGNAL_SIGKILL);
      } catch (err) {
        // Ignore if already terminated
      }
    }

    this.pzStatus = ServerStatus.Stopped;
    this.pzProcess = null;
    this.clearAllTimers();
    this.resetCounters();
    this.broadcastStatus();
    return { success: true };
  }

  updateGame(requestedBranch: string): ControlResult {
    if (ACTIVE_STATUSES.has(this.pzStatus)) {
      return { error: SERVER_STRINGS.ERR_UPDATE_WHILE_RUNNING };
    }

    this.pzStatus = ServerStatus.Updating;
    this.broadcastStatus();
    this.appendLog(SERVER_STRINGS.MSG_STARTING_UPDATE);

    const steamCmdDir = SERVER_CONSTANTS.STEAM_CMD_DIR;
    const steamCmdPath = path.join(steamCmdDir, 'steamcmd.sh');

    if (!fs.existsSync(steamCmdPath)) {
      this.pzStatus = ServerStatus.Stopped;
      this.broadcastStatus();
      return { error: SERVER_STRINGS.ERR_STEAMCMD_NOT_FOUND.replace('{path}', steamCmdPath) };
    }

    const branch = requestedBranch !== undefined ? requestedBranch : this.systemConfig.STEAM_APP_BRANCH;
    const backupDir = path.join(this.systemConfig.DATA_DIR, SERVER_CONSTANTS.PATH_BACKUP_DIR);
    const installedBranchFile = path.join(this.systemConfig.DATA_DIR, SERVER_CONSTANTS.PATH_INSTALLED_BRANCH);

    if (this.installedBranch !== branch) {
      this.appendLog(
        SERVER_STRINGS.MSG_BRANCH_CHANGE_DETECTED
          .replace('{installed}', this.installedBranch || 'estable')
          .replace('{requested}', branch || 'estable')
      );
      try {
        if (fs.existsSync(backupDir)) {
          fs.rmSync(backupDir, { recursive: true, force: true });
        }
        if (fs.existsSync(this.systemConfig.PZ_SERVER_DIR)) {
          fs.renameSync(this.systemConfig.PZ_SERVER_DIR, backupDir);
        }
        fs.mkdirSync(this.systemConfig.PZ_SERVER_DIR, { recursive: true });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.appendLog(`[Manager] Advertencia durante la preparación del cambio seguro: ${message}`);
      }
    }

    this.appendLog(SERVER_STRINGS.MSG_STEAMCMD_DOWNLOADING.replace('{branch}', branch ? `(rama: ${branch})` : '(rama: estable)'));

    const steamArgs = [
      steamCmdPath,
      '+force_install_dir', this.systemConfig.PZ_SERVER_DIR,
      '+login', 'anonymous'
    ];

    if (branch) {
      steamArgs.push('-beta', branch);
    }
    steamArgs.push('+app_update', SERVER_CONSTANTS.STEAM_APP_ID, 'validate', '+quit');

    this.steamCmdProcess = spawn('bash', steamArgs);

    if (this.steamCmdProcess.stdout) {
      this.steamCmdProcess.stdout.on('data', (data: Buffer) => {
        const text = data.toString();
        const lines = text.split('\n');
        lines.forEach((line: string) => {
          if (line.trim()) {
            this.appendLog(`[SteamCMD] ${line}`);
          }
        });
      });
    }

    if (this.steamCmdProcess.stderr) {
      this.steamCmdProcess.stderr.on('data', (data: Buffer) => {
        const text = data.toString();
        const lines = text.split('\n');
        lines.forEach((line: string) => {
          if (line.trim()) {
            this.appendLog(`[SteamCMD ERROR] ${line}`);
          }
        });
      });
    }

    this.steamCmdProcess.on('exit', (code: number | null) => {
      this.appendLog(SERVER_STRINGS.MSG_STEAMCMD_EXIT.replace('{code}', String(code)));
      const startScriptExists = fs.existsSync(path.join(this.systemConfig.PZ_SERVER_DIR, SERVER_CONSTANTS.PATH_START_SCRIPT));

      if (code === 0 && startScriptExists) {
        fs.writeFileSync(installedBranchFile, branch, 'utf8');
        this.installedBranch = branch;
        this.appendLog(SERVER_STRINGS.MSG_UPDATE_SUCCESS.replace('{branch}', branch || 'estable'));
        
        if (fs.existsSync(backupDir)) {
          this.appendLog(SERVER_STRINGS.MSG_CLEANING_BACKUP);
          try {
            fs.rmSync(backupDir, { recursive: true, force: true });
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            this.appendLog(`[Manager] Error al limpiar directorio de backup: ${message}`);
          }
        }
      } else {
        this.appendLog(SERVER_STRINGS.ERR_UPDATE_FAILED.replace('{code}', String(code)));
        if (fs.existsSync(backupDir)) {
          this.appendLog(SERVER_STRINGS.MSG_RESTORING_VERSION);
          try {
            if (fs.existsSync(this.systemConfig.PZ_SERVER_DIR)) {
              fs.rmSync(this.systemConfig.PZ_SERVER_DIR, { recursive: true, force: true });
            }
            fs.renameSync(backupDir, this.systemConfig.PZ_SERVER_DIR);
            this.appendLog(SERVER_STRINGS.MSG_RESTORE_COMPLETE);
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            this.appendLog(SERVER_STRINGS.ERR_CRITICAL_RESTORE_FAILED.replace('{message}', message));
          }
        } else {
          this.appendLog(SERVER_STRINGS.MSG_NO_BACKUP_TO_RESTORE);
        }
      }
      
      this.pzStatus = ServerStatus.Stopped;
      this.steamCmdProcess = null;
      this.broadcastStatus();
    });

    return { success: true };
  }

  sendCommand(commandString: string): ControlResult {
    if (!this.pzProcess || !this.pzProcess.stdin || !COMMANDABLE_STATUSES.has(this.pzStatus)) {
      return { error: SERVER_STRINGS.ERR_SERVER_NOT_ACTIVE_FOR_COMMANDS };
    }

    const cleanCommand = commandString.trim();
    this.appendLog(`[Admin Input] > ${cleanCommand}`);
    
    this.pzProcess.stdin.write(cleanCommand + '\n');
    return { success: true };
  }

  // --- Sub-functions for player count and inactivity check ---

  setPanelConfig(config: PanelConfig): void {
    this.idleShutdownMinutes = config.idleShutdownMinutes || 0;
    this.appendLog(SERVER_STRINGS.MSG_INACTIVITY_SHUTDOWN_UPDATED.replace('{minutes}', String(this.idleShutdownMinutes)));
    this.checkIdleShutdown();
  }

  queryPlayerCount(): void {
    if (this.pzProcess && this.pzProcess.stdin && this.pzStatus === ServerStatus.Running) {
      this.pzProcess.stdin.write(SERVER_CONSTANTS.CMD_PLAYERS);
    }
  }

  updatePlayerCount(count: number): void {
    if (this.onlinePlayerCount !== count) {
      this.appendLog(SERVER_STRINGS.MSG_PLAYER_COUNT_UPDATED.replace('{count}', String(count)));
      this.onlinePlayerCount = count;
      this.broadcastStatus();
    }
    this.checkIdleShutdown();
  }

  checkIdleShutdown(): void {
    if (this.pzStatus !== ServerStatus.Running) {
      if (this.idleShutdownTimer) {
        clearTimeout(this.idleShutdownTimer);
        this.idleShutdownTimer = null;
        this.idleShutdownExpiresAt = null;
      }
      return;
    }

    if (this.idleShutdownMinutes > 0 && this.onlinePlayerCount === 0) {
      if (!this.idleShutdownTimer) {
        this.appendLog(SERVER_STRINGS.MSG_SERVER_EMPTY_SHUTDOWN.replace('{minutes}', String(this.idleShutdownMinutes)));
        this.idleShutdownExpiresAt = Date.now() + this.idleShutdownMinutes * 60 * 1000;
        this.idleShutdownTimer = setTimeout(() => this.triggerIdleShutdown(), this.idleShutdownMinutes * 60 * 1000);
        this.broadcastStatus();
      }
    } else {
      if (this.idleShutdownTimer) {
        this.appendLog(SERVER_STRINGS.MSG_CANCELING_SHUTDOWN_TIMER.replace('{count}', String(this.onlinePlayerCount)));
        clearTimeout(this.idleShutdownTimer);
        this.idleShutdownTimer = null;
        this.idleShutdownExpiresAt = null;
        this.broadcastStatus();
      }
    }
  }

  triggerIdleShutdown(): void {
    this.appendLog(SERVER_STRINGS.MSG_TRIGGERING_INACTIVITY_SHUTDOWN.replace('{minutes}', String(this.idleShutdownMinutes)));
    this.idleShutdownTimer = null;
    this.idleShutdownExpiresAt = null;
    this.stopServer();
  }
}

// Exportar una única instancia Singleton
let processControlInstance: PzProcessControlService | null = null;
export function getProcessControlService(systemConfig: ISystemConfig, configRepository: IConfigRepository): PzProcessControlService {
  if (!processControlInstance) {
    processControlInstance = new PzProcessControlService(systemConfig, configRepository);
  }
  return processControlInstance;
}
export { PzProcessControlService };
