import fs from 'fs';
import path from 'path';
import IServerControlService from '../../domain/ports/IServerControlService.js';
import type {
  ControlResult,
  ServerStatusPayload,
  ProcessObserver,
  PanelConfig
} from '../../types.js';

export class MultiGameProcessControlService implements IServerControlService {
  private readonly registryFilePath: string;

  constructor(
    dataDir: string,
    private readonly gameServices: Record<string, IServerControlService>
  ) {
    this.registryFilePath = path.join(dataDir, 'instances', 'registry.json');
  }

  private getActiveGameSync(): string {
    try {
      const raw = fs.readFileSync(this.registryFilePath, 'utf8');
      const parsed = JSON.parse(raw);
      const activeId = parsed.activeInstanceId;
      if (!activeId) return 'project-zomboid';
      const inst = parsed.instances.find((i: any) => i.id === activeId);
      return inst?.game || 'project-zomboid';
    } catch (_) {
      return 'project-zomboid';
    }
  }

  private getActiveService(): IServerControlService {
    const game = this.getActiveGameSync();
    const service = this.gameServices[game];
    if (!service) {
      return this.gameServices['project-zomboid'];
    }
    return service;
  }

  getStatus(): ServerStatusPayload {
    return this.getActiveService().getStatus();
  }

  startServer(): ControlResult {
    return this.getActiveService().startServer();
  }

  stopServer(): ControlResult {
    return this.getActiveService().stopServer();
  }

  restartServer(): ControlResult {
    return this.getActiveService().restartServer();
  }

  killServer(): ControlResult {
    return this.getActiveService().killServer();
  }

  updateGame(branch: string): ControlResult {
    return this.getActiveService().updateGame(branch);
  }

  sendCommand(cmd: string): ControlResult {
    return this.getActiveService().sendCommand(cmd);
  }

  subscribe(observer: ProcessObserver): void {
    for (const service of Object.values(this.gameServices)) {
      service.subscribe(observer);
    }
  }

  unsubscribe(observer: ProcessObserver): void {
    for (const service of Object.values(this.gameServices)) {
      service.unsubscribe(observer);
    }
  }

  setPanelConfig(config: PanelConfig): void {
    this.getActiveService().setPanelConfig(config);
  }

  appendExternalLog(line: string): void {
    const active = this.getActiveService() as any;
    if (typeof active.appendExternalLog === 'function') {
      active.appendExternalLog(line);
    }
  }
}
