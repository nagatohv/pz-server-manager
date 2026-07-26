import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import PzConfigRepository from '../adapters/repositories/PzConfigRepository.js';
import IniParserStrategy from '../adapters/parsers/IniParserStrategy.js';
import SandboxParserStrategy from '../adapters/parsers/SandboxParserStrategy.js';
import SpawnParserStrategy from '../adapters/parsers/SpawnParserStrategy.js';
import type { ISystemConfig } from '../types.js';

describe('PzConfigRepository', () => {
  let tmpDir: string;
  let mockSystemConfig: ISystemConfig;
  let repo: PzConfigRepository;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pz-repo-test-'));
    mockSystemConfig = {
      PORT: 3000,
      JWT_SECRET: 'test-secret',
      ADMIN_PASSWORD: 'admin',
      DATA_DIR: path.join(tmpDir, 'data'),
      PZ_SERVER_DIR: path.join(tmpDir, 'pzserver'),
      ZO_USER_DIR: path.join(tmpDir, 'Zomboid'),
      SERVER_NAME: 'testserver',
      STEAM_APP_BRANCH: '',
      JVM_MIN_GB: 4,
      JVM_MAX_GB: 8
    };
    repo = new PzConfigRepository(
      mockSystemConfig,
      new IniParserStrategy(),
      new SandboxParserStrategy(),
      new SpawnParserStrategy()
    );
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('should resolve file paths correctly', () => {
    expect(repo.getFilePath('ini')).toContain('testserver.ini');
    expect(repo.getFilePath('sandbox')).toContain('testserver_SandboxVars.lua');
    expect(repo.getFilePath('spawn')).toContain('testserver_spawnregions.lua');
    expect(repo.getFilePath('panel')).toContain('panel_config.json');
    expect(repo.getFilePath('unknown')).toBeNull();
  });

  it('should ensure default ini file is created and parse settings', () => {
    const settings = repo.readIniSettings();
    expect(settings.length).toBeGreaterThan(0);

    const maxPlayers = settings.find(s => s.key === 'MaxPlayers');
    expect(maxPlayers?.value).toBe('16');
  });

  it('should save and read back ini settings', () => {
    repo.readIniSettings(); // ensure default created
    const saveResult = repo.saveIniSettings({ MaxPlayers: '32', PVP: 'false' });
    expect(saveResult.success).toBe(true);

    const updated = repo.readIniSettings();
    const maxPlayers = updated.find(s => s.key === 'MaxPlayers');
    expect(maxPlayers?.value).toBe('32');
  });

  it('should manage panel config (read and save)', () => {
    const initialConfig = repo.readPanelConfig();
    expect(initialConfig.idleShutdownMinutes).toBe(0);
    expect(initialConfig.serverLanguage).toBe('es');

    const saved = repo.savePanelConfig({ idleShutdownMinutes: 15, serverLanguage: 'en' });
    expect(saved.idleShutdownMinutes).toBe(15);
    expect(saved.serverLanguage).toBe('en');

    const reread = repo.readPanelConfig();
    expect(reread.idleShutdownMinutes).toBe(15);
    expect(reread.serverLanguage).toBe('en');
  });

  it('should read and save raw files', () => {
    expect(repo.readRawFile('sandbox')).toBe('');
    
    const rawContent = 'SandboxVars = { Zombies = 1 }';
    const saveResult = repo.saveRawFile('sandbox', rawContent);
    expect(saveResult.success).toBe(true);

    expect(repo.readRawFile('sandbox')).toBe(rawContent);
  });

  it('should throw error for invalid file type or read errors', () => {
    expect(() => repo.readIniSettings()).not.toThrow();
    expect(repo.getFilePath('invalid')).toBeNull();
    expect(() => repo.readRawFile('invalid')).toThrow();
  });
});
