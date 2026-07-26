import fs from 'fs';
import path from 'path';
import IConfigRepository from '../../domain/ports/IConfigRepository.js';
import IniParserStrategy from '../parsers/IniParserStrategy.js';
import SandboxParserStrategy from '../parsers/SandboxParserStrategy.js';
import SpawnParserStrategy from '../parsers/SpawnParserStrategy.js';
import { SERVER_STRINGS } from '../../config/strings.js';
import { ConfigFileType } from '../../types.js';
import type { IniSetting, PanelConfig, ISystemConfig } from '../../types.js';

const DEFAULT_PANEL_CONFIG: PanelConfig = {
  idleShutdownMinutes: 0,
  serverLanguage: 'es'
};

const DEFAULT_INI_CONTENT = `# Plantilla por defecto de Project Zomboid
MaxPlayers=16
PingLimit=400
PVP=true
SafetySystem=true
ShowSafety=true
Port=16261
RCONPort=27015
RCONPassword=admin
Public=false
Open=true
AutoCreateUserInWhiteList=true
SpeedLimit=70.0
BadWordPolicy=3
MapRemotePlayerVisibility=1
AntiCheatSafety=4
AntiCheatMovement=4
AntiCheatHit=4
AntiCheatPacket=4
AntiCheatPermission=2
AntiCheatXP=2
AntiCheatSafeHouse=2
AntiCheatPlayer=2
AntiCheatChecksum=4
AntiCheatItem=4
UsePhysicsHitReaction=false
`;

/**
 * Repository implementing IConfigRepository.
 * Manages physical read/write operations of Project Zomboid configuration files.
 */
export default class PzConfigRepository implements IConfigRepository {
  private systemConfig: ISystemConfig;
  private iniStrategy: IniParserStrategy;
  private sandboxStrategy: SandboxParserStrategy;
  private spawnStrategy: SpawnParserStrategy;

  constructor(
    systemConfig: ISystemConfig,
    iniStrategy: IniParserStrategy,
    sandboxStrategy: SandboxParserStrategy,
    spawnStrategy: SpawnParserStrategy
  ) {
    this.systemConfig = systemConfig;
    this.iniStrategy = iniStrategy;
    this.sandboxStrategy = sandboxStrategy;
    this.spawnStrategy = spawnStrategy;
  }

  /**
   * Helper to resolve physical paths for different file types.
   */
  getFilePath(type: string): string | null {
    const configDir = path.join(this.systemConfig.ZO_USER_DIR, 'Server');
    switch (type) {
      case ConfigFileType.Ini:
        return path.join(configDir, `${this.systemConfig.SERVER_NAME}.ini`);
      case ConfigFileType.Sandbox:
        return path.join(configDir, `${this.systemConfig.SERVER_NAME}_SandboxVars.lua`);
      case ConfigFileType.Spawn:
        return path.join(configDir, `${this.systemConfig.SERVER_NAME}_spawnregions.lua`);
      case ConfigFileType.Panel:
        return path.join(this.systemConfig.DATA_DIR, 'panel_config.json');
      default:
        return null;
    }
  }

  /**
   * Ensure default files exist (creates initial templates if missing).
   */
  ensureDefaultIni(filePath: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, DEFAULT_INI_CONTENT, 'utf8');
    }
  }

  readIniSettings(): IniSetting[] {
    const filePath = this.getFilePath(ConfigFileType.Ini);
    if (!filePath) throw new Error(SERVER_STRINGS.ERR_INVALID_FILE_TYPE);
    this.ensureDefaultIni(filePath);

    try {
      const rawContent = fs.readFileSync(filePath, 'utf8');
      return this.iniStrategy.parse(rawContent);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(SERVER_STRINGS.ERR_READ_FILE_FAILED.replace('{type}', 'server.ini').replace('{message}', message));
    }
  }

  saveIniSettings(settingsObj: Record<string, string>): { success: boolean } {
    const filePath = this.getFilePath(ConfigFileType.Ini);
    if (!filePath) throw new Error(SERVER_STRINGS.ERR_INVALID_FILE_TYPE);
    try {
      const rawContent = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
      const updatedContent = this.iniStrategy.serialize(settingsObj, rawContent);
      
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      fs.writeFileSync(filePath, updatedContent, 'utf8');
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(SERVER_STRINGS.ERR_SAVE_FILE_FAILED.replace('{type}', 'server.ini').replace('{message}', message));
    }
  }

  readPanelConfig(): PanelConfig {
    const filePath = this.getFilePath(ConfigFileType.Panel);
    if (!filePath || !fs.existsSync(filePath)) {
      return { ...DEFAULT_PANEL_CONFIG };
    }
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<PanelConfig>;
      return {
        idleShutdownMinutes: parsed.idleShutdownMinutes || DEFAULT_PANEL_CONFIG.idleShutdownMinutes,
        serverLanguage: parsed.serverLanguage || DEFAULT_PANEL_CONFIG.serverLanguage
      };
    } catch (err) {
      return { ...DEFAULT_PANEL_CONFIG };
    }
  }

  savePanelConfig(config: PanelConfig): PanelConfig {
    const filePath = this.getFilePath(ConfigFileType.Panel);
    if (!filePath) throw new Error(SERVER_STRINGS.ERR_INVALID_FILE_TYPE);
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const cleanConfig: PanelConfig = {
        idleShutdownMinutes: Math.max(0, parseInt(String(config.idleShutdownMinutes), 10) || 0),
        serverLanguage: config.serverLanguage || DEFAULT_PANEL_CONFIG.serverLanguage
      };
      fs.writeFileSync(filePath, JSON.stringify(cleanConfig, null, 2), 'utf8');
      return cleanConfig;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(SERVER_STRINGS.ERR_SAVE_FILE_FAILED.replace('{type}', 'panel_config.json').replace('{message}', message));
    }
  }

  readRawFile(type: string): string {
    const filePath = this.getFilePath(type);
    if (!filePath) throw new Error(SERVER_STRINGS.ERR_INVALID_FILE_TYPE);

    if (!fs.existsSync(filePath)) {
      return '';
    }
    try {
      return fs.readFileSync(filePath, 'utf8');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(SERVER_STRINGS.ERR_READ_FILE_FAILED.replace('{type}', type).replace('{message}', message));
    }
  }

  saveRawFile(type: string, content: string): { success: boolean } {
    const filePath = this.getFilePath(type);
    if (!filePath) throw new Error(SERVER_STRINGS.ERR_INVALID_FILE_TYPE);

    try {
      // Path Traversal Mitigation: Ensure we only write inside our configured directories
      const resolvedPath = path.resolve(filePath);
      const allowedDir1 = path.resolve(this.systemConfig.ZO_USER_DIR);
      const allowedDir2 = path.resolve(this.systemConfig.DATA_DIR);

      if (!resolvedPath.startsWith(allowedDir1) && !resolvedPath.startsWith(allowedDir2)) {
        throw new Error(SERVER_STRINGS.ERR_PATH_TRAVERSAL_DETECTED);
      }

      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(filePath, content, 'utf8');
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(SERVER_STRINGS.ERR_SAVE_FILE_FAILED.replace('{type}', type).replace('{message}', message));
    }
  }
}
