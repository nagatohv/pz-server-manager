import IServerControlService from '../domain/ports/IServerControlService.js';
import { AppError } from '../domain/AppError.js';
import { ERROR_CODES } from '../config/errorCodes.js';
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

  getStatus(): ServerStatusPayload {
    return this.serverControlService.getStatus();
  }

  start(): ControlResult {
    return this.serverControlService.startServer();
  }

  stop(): ControlResult {
    return this.serverControlService.stopServer();
  }

  restart(): ControlResult {
    return this.serverControlService.restartServer();
  }

  kill(): ControlResult {
    return this.serverControlService.killServer();
  }

  update(branch: string): ControlResult {
    return this.serverControlService.updateGame(branch);
  }

  sendCommand(command: string): ControlResult {
    if (!command) {
      throw new AppError(ERROR_CODES.ERR_COMMAND_REQUIRED, SERVER_STRINGS.ERR_COMMAND_REQUIRED);
    }
    return this.serverControlService.sendCommand(command);
  }
}
