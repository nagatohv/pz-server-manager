/**
 * Port for the high-level PZ instance orchestration service.
 * Sits above IPzInstanceRepository and is responsible for atomic on-disk
 * state changes (create / delete / migrate / select / install) so the
 * use cases only need a single dependency.
 */
import type { PzInstance, PzInstanceRegistry } from '../../types.js';

/** Payload required to create a new PZ server instance. */
export interface CreateInstanceInput {
  name: string;
  game?: string;
  branch: string;
  gamePort: number;
  rconPort: number;
  maxPlayers: number;
}

/** Result of a successful create operation. */
export interface CreateInstanceResult {
  instance: PzInstance;
}

/** Result of a successful migration. */
export interface MigrateInstanceResult {
  sourceId: string;
  targetId: string;
  /** Bytes copied from source.Zomboid to target.Zomboid. */
  bytesCopied: number;
  filesCopied: number;
}

/** Result of a successful SteamCMD install/update. */
export interface InstallInstanceResult {
  instance: PzInstance;
  /** True if the install completed (exit 0) and the start script exists. */
  success: boolean;
}

export default interface IPzInstanceService {
  /** Returns the current registry (instances + active id). */
  listInstances(): Promise<PzInstanceRegistry>;

  /** Creates a new instance and its on-disk directory layout. */
  createInstance(input: CreateInstanceInput): Promise<CreateInstanceResult>;

  /** Deletes the instance directory and removes it from the registry. */
  deleteInstance(id: string): Promise<void>;

  /** Sets the active instance (only one can run at a time). */
  selectInstance(id: string): Promise<PzInstance>;

  /** Copies the user data dir from one instance to another. */
  migrateUserData(sourceId: string, targetId: string): Promise<MigrateInstanceResult>;

  /** Scans and deletes unnecessary files (core dumps, old logs) to free disk space. */
  cleanupInstance(id: string): Promise<{ filesRemoved: number; bytesFreed: number }>;

  /**
   * Runs SteamCMD `+app_update` against the instance's current branch. The
   * install is fire-and-forget: this method kicks off the background
   * process and returns once SteamCMD has launched; callers should subscribe
   * to logs/status to track progress.
   */
  installInstance(id: string): Promise<InstallInstanceResult>;
}
