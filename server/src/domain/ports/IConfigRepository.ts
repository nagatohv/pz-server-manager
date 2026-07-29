/**
 * Interface/Port for Configuration Repository.
 * Defines the contract for parsing, reading, and saving Project Zomboid configuration files.
 */
import type { IniSetting, PanelConfig } from '../../types.js';

export default interface IConfigRepository {
  readIniSettings(overrideDataDir?: string): IniSetting[];
  saveIniSettings(settings: Record<string, string>, overrideDataDir?: string): { success: boolean };
  readPanelConfig(overrideDataDir?: string): PanelConfig;
  savePanelConfig(config: PanelConfig, overrideDataDir?: string): PanelConfig;
  readRawFile(type: string, overrideDataDir?: string): string;
  saveRawFile(type: string, content: string, overrideDataDir?: string): { success: boolean };
}
