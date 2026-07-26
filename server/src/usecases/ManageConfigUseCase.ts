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
  getSettings(): IniSetting[] {
    return this.configRepository.readIniSettings();
  }

  /**
   * Save parsed settings back to server.ini.
   */
  saveSettings(settings: Record<string, string>): { success: boolean } {
    return this.configRepository.saveIniSettings(settings);
  }

  /**
   * Read backend panel options.
   */
  getPanelConfig(): PanelConfig {
    return this.configRepository.readPanelConfig();
  }

  /**
   * Save backend panel options.
   */
  savePanelConfig(config: PanelConfig): PanelConfig {
    return this.configRepository.savePanelConfig(config);
  }

  /**
   * Read raw file contents.
   */
  getRawFile(type: string): string {
    return this.configRepository.readRawFile(type);
  }

  /**
   * Write raw file contents.
   */
  saveRawFile(type: string, content: string): { success: boolean } {
    return this.configRepository.saveRawFile(type, content);
  }
}
