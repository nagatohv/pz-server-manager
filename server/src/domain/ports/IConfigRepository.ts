/**
 * Interface/Port for Configuration Repository.
 * Defines the contract for parsing, reading, and saving Project Zomboid configuration files.
 */
import type { IniSetting, PanelConfig } from '../../types.js';

export default interface IConfigRepository {
  readIniSettings(): IniSetting[];
  saveIniSettings(settings: Record<string, string>): { success: boolean };
  readPanelConfig(): PanelConfig;
  savePanelConfig(config: PanelConfig): PanelConfig;
  readRawFile(type: string): string;
  saveRawFile(type: string, content: string): { success: boolean };
}
