import fs from 'fs';
import path from 'path';
import IConfigRepository from '../../domain/ports/IConfigRepository.js';
import IniParserStrategy from '../parsers/IniParserStrategy.js';
import SandboxParserStrategy from '../parsers/SandboxParserStrategy.js';
import SpawnParserStrategy from '../parsers/SpawnParserStrategy.js';
import { AppError } from '../../domain/AppError.js';
import { ERROR_CODES } from '../../config/errorCodes.js';
import { SERVER_STRINGS } from '../../config/strings.js';
import { ConfigFileType } from '../../types.js';
import type { IniSetting, PanelConfig, ISystemConfig } from '../../types.js';

const DEFAULT_PANEL_CONFIG: PanelConfig = {
  idleShutdownMinutes: 0,
  serverLanguage: 'es'
};

const DEFAULT_INI_CONTENT = `# Project Zomboid default settings template
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

  getFilePath(type: string, overrideDataDir?: string): string | null {
    const userDir = overrideDataDir ?? this.systemConfig.ZO_USER_DIR;
    const configDir = path.join(userDir, 'Server');
    switch (type) {
      case ConfigFileType.Ini:
        return path.join(configDir, `${this.systemConfig.SERVER_NAME}.ini`);
      case ConfigFileType.Sandbox:
        return path.join(configDir, `${this.systemConfig.SERVER_NAME}_SandboxVars.lua`);
      case ConfigFileType.Spawn:
        return path.join(configDir, `${this.systemConfig.SERVER_NAME}_spawnregions.lua`);
      case ConfigFileType.Panel:
        return overrideDataDir
          ? path.join(overrideDataDir, 'panel_config.json')
          : path.join(this.systemConfig.DATA_DIR, 'panel_config.json');
      default:
        return null;
    }
  }

  ensureDefaultIni(filePath: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, DEFAULT_INI_CONTENT, 'utf8');
    }
  }

  readIniSettings(overrideDataDir?: string): IniSetting[] {
    const filePath = this.getFilePath(ConfigFileType.Ini, overrideDataDir);
    if (!filePath) {
      throw new AppError(ERROR_CODES.ERR_INVALID_FILE_TYPE, SERVER_STRINGS.ERR_INVALID_FILE_TYPE);
    }
    this.ensureDefaultIni(filePath);

    try {
      const rawContent = fs.readFileSync(filePath, 'utf8');
      return this.iniStrategy.parse(rawContent);
    } catch (err: unknown) {
      if (err instanceof AppError) throw err;
      const message = err instanceof Error ? err.message : String(err);
      throw new AppError(
        ERROR_CODES.ERR_READ_FILE_FAILED,
        SERVER_STRINGS.ERR_READ_FILE_FAILED.replace('{type}', 'server.ini').replace('{message}', message),
        { type: 'server.ini', message }
      );
    }
  }

  saveIniSettings(settingsObj: Record<string, string>, overrideDataDir?: string): { success: boolean } {
    const filePath = this.getFilePath(ConfigFileType.Ini, overrideDataDir);
    if (!filePath) {
      throw new AppError(ERROR_CODES.ERR_INVALID_FILE_TYPE, SERVER_STRINGS.ERR_INVALID_FILE_TYPE);
    }
    try {
      const rawContent = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
      const updatedContent = this.iniStrategy.serialize(settingsObj, rawContent);

      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      fs.writeFileSync(filePath, updatedContent, 'utf8');
      return { success: true };
    } catch (err: unknown) {
      if (err instanceof AppError) throw err;
      const message = err instanceof Error ? err.message : String(err);
      throw new AppError(
        ERROR_CODES.ERR_SAVE_FILE_FAILED,
        SERVER_STRINGS.ERR_SAVE_FILE_FAILED.replace('{type}', 'server.ini').replace('{message}', message),
        { type: 'server.ini', message }
      );
    }
  }

  readPanelConfig(overrideDataDir?: string): PanelConfig {
    const filePath = this.getFilePath(ConfigFileType.Panel, overrideDataDir);
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

  savePanelConfig(config: PanelConfig, overrideDataDir?: string): PanelConfig {
    const filePath = this.getFilePath(ConfigFileType.Panel, overrideDataDir);
    if (!filePath) {
      throw new AppError(ERROR_CODES.ERR_INVALID_FILE_TYPE, SERVER_STRINGS.ERR_INVALID_FILE_TYPE);
    }
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
      if (err instanceof AppError) throw err;
      const message = err instanceof Error ? err.message : String(err);
      throw new AppError(
        ERROR_CODES.ERR_SAVE_FILE_FAILED,
        SERVER_STRINGS.ERR_SAVE_FILE_FAILED.replace('{type}', 'panel_config.json').replace('{message}', message),
        { type: 'panel_config.json', message }
      );
    }
  }

  readRawFile(type: string, overrideDataDir?: string): string {
    const filePath = this.getFilePath(type, overrideDataDir);
    if (!filePath) {
      throw new AppError(ERROR_CODES.ERR_INVALID_FILE_TYPE, SERVER_STRINGS.ERR_INVALID_FILE_TYPE);
    }

    if (!fs.existsSync(filePath)) {
      return '';
    }
    try {
      return fs.readFileSync(filePath, 'utf8');
    } catch (err: unknown) {
      if (err instanceof AppError) throw err;
      const message = err instanceof Error ? err.message : String(err);
      throw new AppError(
        ERROR_CODES.ERR_READ_FILE_FAILED,
        SERVER_STRINGS.ERR_READ_FILE_FAILED.replace('{type}', type).replace('{message}', message),
        { type, message }
      );
    }
  }

  saveRawFile(type: string, content: string, overrideDataDir?: string): { success: boolean } {
    const filePath = this.getFilePath(type, overrideDataDir);
    if (!filePath) {
      throw new AppError(ERROR_CODES.ERR_INVALID_FILE_TYPE, SERVER_STRINGS.ERR_INVALID_FILE_TYPE);
    }

    try {
      const resolvedPath = path.resolve(filePath);
      const allowedDir1 = path.resolve(overrideDataDir ?? this.systemConfig.ZO_USER_DIR);
      const allowedDir2 = path.resolve(this.systemConfig.DATA_DIR);

      if (!resolvedPath.startsWith(allowedDir1) && !resolvedPath.startsWith(allowedDir2)) {
        throw new AppError(
          ERROR_CODES.ERR_PATH_TRAVERSAL_DETECTED,
          SERVER_STRINGS.ERR_PATH_TRAVERSAL_DETECTED
        );
      }

      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(filePath, content, 'utf8');
      return { success: true };
    } catch (err: unknown) {
      if (err instanceof AppError) throw err;
      const message = err instanceof Error ? err.message : String(err);
      throw new AppError(
        ERROR_CODES.ERR_SAVE_FILE_FAILED,
        SERVER_STRINGS.ERR_SAVE_FILE_FAILED.replace('{type}', type).replace('{message}', message),
        { type, message }
      );
    }
  }
}
