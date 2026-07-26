import 'dotenv/config';
import path from 'path';
import { SERVER_CONSTANTS } from './constants.js';
import type { ISystemConfig } from '../types.js';

/**
 * SystemConfig class encapsulates all environment variables, default directory paths,
 * and system thresholds in a single read-only object to ensure zero hardcode across the codebase.
 */
class SystemConfig implements ISystemConfig {
  public PORT: number;
  public JWT_SECRET: string;
  public ADMIN_PASSWORD: string;
  public DATA_DIR: string;
  public PZ_SERVER_DIR: string;
  public ZO_USER_DIR: string;
  public SERVER_NAME: string;
  public STEAM_APP_BRANCH: string;
  public JVM_MIN_GB: number;
  public JVM_MAX_GB: number;

  constructor() {
    this.PORT = Number(process.env.PORT) || SERVER_CONSTANTS.DEFAULT_PORT;
    this.JWT_SECRET = process.env.JWT_SECRET || SERVER_CONSTANTS.DEFAULT_JWT_SECRET;
    this.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || SERVER_CONSTANTS.DEFAULT_ADMIN_PASSWORD;
    
    // Base directories
    this.DATA_DIR = process.env.DATA_DIR || SERVER_CONSTANTS.DEFAULT_DATA_DIR;
    this.PZ_SERVER_DIR = path.join(this.DATA_DIR, 'pzserver');
    this.ZO_USER_DIR = path.join(this.DATA_DIR, 'Zomboid');
    
    // Server settings
    this.SERVER_NAME = process.env.SERVER_NAME || 'servertest';
    this.STEAM_APP_BRANCH = process.env.STEAMAPPBRANCH || '';
    
    // Memory values
    this.JVM_MIN_GB = Math.max(1, parseInt(process.env.JVM_MIN_GB || '', 10) || SERVER_CONSTANTS.JVM_MIN_GB_FALLBACK);
    this.JVM_MAX_GB = Math.max(1, parseInt(process.env.JVM_MAX_GB || '', 10) || SERVER_CONSTANTS.JVM_MAX_GB_FALLBACK);
  }
}

// Export as Singleton instance
const systemConfig = new SystemConfig();
export default systemConfig;
