/**
 * Interface/Port for Server Control Service.
 * Defines the contract for executing actions on the game server process.
 */
import type {
  ControlResult,
  ServerStatusPayload,
  ProcessObserver,
  PanelConfig
} from '../../types.js';

export default interface IServerControlService {
  getStatus(): ServerStatusPayload;
  startServer(): ControlResult;
  stopServer(): ControlResult;
  restartServer(): ControlResult;
  killServer(): ControlResult;
  updateGame(branch: string): ControlResult;
  sendCommand(cmd: string): ControlResult;
  subscribe(observer: ProcessObserver): void;
  unsubscribe(observer: ProcessObserver): void;
  setPanelConfig(config: PanelConfig): void;
}
