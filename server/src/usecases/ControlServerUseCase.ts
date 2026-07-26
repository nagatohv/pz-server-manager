import IServerControlService from '../domain/ports/IServerControlService.js';
import { SERVER_STRINGS } from '../config/strings.js';
import type { ControlResult, ServerStatusPayload } from '../types.js';

/**
 * Use case to orchestrate server process management operations.
 */
export default class ControlServerUseCase {
  public serverControlService: IServerControlService;

  constructor(serverControlService: IServerControlService) {
    this.serverControlService = serverControlService;
  }

  /**
   * Get current server status.
   */
  getStatus(): ServerStatusPayload {
    return this.serverControlService.getStatus();
  }

  /**
   * Safe server startup.
   */
  start(): ControlResult {
    return this.serverControlService.startServer();
  }

  /**
   * Safe server shutdown.
   */
  stop(): ControlResult {
    return this.serverControlService.stopServer();
  }

  /**
   * Force server termination.
   */
  kill(): ControlResult {
    return this.serverControlService.killServer();
  }

  /**
   * Trigger server update.
   */
  update(branch: string): ControlResult {
    return this.serverControlService.updateGame(branch);
  }

  /**
   * Dispatch an interactive command to the server console.
   */
  sendCommand(command: string): ControlResult {
    if (!command) {
      throw new Error(SERVER_STRINGS.ERR_COMMAND_REQUIRED);
    }
    return this.serverControlService.sendCommand(command);
  }
}
