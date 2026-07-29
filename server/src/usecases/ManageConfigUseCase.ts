import IConfigRepository from '../domain/ports/IConfigRepository.js';
import type { IniSetting, PanelConfig } from '../types.js';

/**
 * Use case to orchestrate configuration files management (ini, lua, panel config).
 */
export default class ManageConfigUseCase {
  private configRepository: IConfigRepository;

  constructor(configRepository: IConfigRepository) {
    this.configRepository = configRepository;
  }

  /**
   * Fetch all raw server.ini settings parsed as flat key-value pairs.
   */
  getSettings(overrideDataDir?: string): IniSetting[] {
    return overrideDataDir !== undefined
      ? this.configRepository.readIniSettings(overrideDataDir)
      : this.configRepository.readIniSettings();
  }

  /**
   * Save parsed settings back to server.ini.
   */
  saveSettings(settings: Record<string, string>, overrideDataDir?: string): { success: boolean } {
    return overrideDataDir !== undefined
      ? this.configRepository.saveIniSettings(settings, overrideDataDir)
      : this.configRepository.saveIniSettings(settings);
  }

  /**
   * Read backend panel options.
   */
  getPanelConfig(overrideDataDir?: string): PanelConfig {
    return overrideDataDir !== undefined
      ? this.configRepository.readPanelConfig(overrideDataDir)
      : this.configRepository.readPanelConfig();
  }

  /**
   * Save backend panel options.
   */
  savePanelConfig(config: PanelConfig, overrideDataDir?: string): PanelConfig {
    return overrideDataDir !== undefined
      ? this.configRepository.savePanelConfig(config, overrideDataDir)
      : this.configRepository.savePanelConfig(config);
  }

  /**
   * Read raw file contents.
   */
  getRawFile(type: string, overrideDataDir?: string): string {
    return overrideDataDir !== undefined
      ? this.configRepository.readRawFile(type, overrideDataDir)
      : this.configRepository.readRawFile(type);
  }

  /**
   * Write raw file contents.
   */
  saveRawFile(type: string, content: string, overrideDataDir?: string): { success: boolean } {
    return overrideDataDir !== undefined
      ? this.configRepository.saveRawFile(type, content, overrideDataDir)
      : this.configRepository.saveRawFile(type, content);
  }
}
