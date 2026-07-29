import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import AuthenticateUseCase from '../../usecases/AuthenticateUseCase.js';
import ControlServerUseCase from '../../usecases/ControlServerUseCase.js';
import ManageConfigUseCase from '../../usecases/ManageConfigUseCase.js';
import ListBranchesUseCase from '../../usecases/ListBranchesUseCase.js';
import { PzInstanceService } from '../../adapters/services/PzInstanceService.js';
import IniParserStrategy from '../../adapters/parsers/IniParserStrategy.js';
import SandboxParserStrategy from '../../adapters/parsers/SandboxParserStrategy.js';
import SpawnParserStrategy from '../../adapters/parsers/SpawnParserStrategy.js';
import { SERVER_STRINGS } from '../../config/strings.js';
import { SERVER_CONSTANTS } from '../../config/constants.js';
import { ServerAction, ConfigFileType } from '../../types.js';
import type { AuthTokenPayload, PanelConfig } from '../../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = process.env.NODE_ENV === 'production' || __dirname.endsWith('dist') || !__dirname.includes('src');
const clientDistPath = isProduction 
  ? path.resolve(__dirname, '../../client/dist') 
  : path.resolve(__dirname, '../../../../client/dist');

interface AuthenticatedRequest extends Request {
  user?: AuthTokenPayload;
}

/** Maps ServerAction to use-case method and success message. */
const ACTION_HANDLERS: Record<ServerAction, {
  handler: (uc: ControlServerUseCase, body: Record<string, string>) => { success?: boolean; error?: string };
  successMessage: string;
}> = {
  [ServerAction.Start]:   { handler: (uc) => uc.start(),              successMessage: SERVER_STRINGS.MSG_ACTION_START },
  [ServerAction.Stop]:    { handler: (uc) => uc.stop(),               successMessage: SERVER_STRINGS.MSG_ACTION_STOP },
  [ServerAction.Restart]: { handler: (uc) => uc.restart(),            successMessage: SERVER_STRINGS.MSG_ACTION_RESTART },
  [ServerAction.Kill]:    { handler: (uc) => uc.kill(),               successMessage: SERVER_STRINGS.MSG_ACTION_KILL },
  [ServerAction.Update]:  { handler: (uc, b) => uc.update(b.branch),  successMessage: SERVER_STRINGS.MSG_ACTION_UPDATE },
  [ServerAction.Command]: { handler: (uc, b) => uc.sendCommand(b.command), successMessage: SERVER_STRINGS.MSG_ACTION_COMMAND }
};

/** Maps ConfigFileType to the parser strategy that handles it. */
type ParserMap = Record<string, IniParserStrategy | SandboxParserStrategy | SpawnParserStrategy>;

import IPzBackupService from '../../domain/ports/IPzBackupService.js';
import { PzBackupService } from '../../adapters/services/PzBackupService.js';

/**
 * Factory function to build the Express Application with dependencies injected.
 */
export default function createExpressApp(
  authenticateUseCase: AuthenticateUseCase,
  controlServerUseCase: ControlServerUseCase,
  manageConfigUseCase: ManageConfigUseCase,
  listBranchesUseCase: ListBranchesUseCase,
  instanceService: PzInstanceService,
  iniStrategy: IniParserStrategy,
  sandboxStrategy: SandboxParserStrategy,
  spawnStrategy: SpawnParserStrategy,
  backupServiceInput?: IPzBackupService
) {
  const app = express();
  const backupService = backupServiceInput ?? new PzBackupService({
    dataDir: (instanceService as any).dataDir,
    repository: (instanceService as any).repository
  });

  app.use(cors());
  app.use(express.json());
  app.use(express.static(clientDistPath));

  const parsers: ParserMap = {
    [ConfigFileType.Ini]: iniStrategy,
    [ConfigFileType.Sandbox]: sandboxStrategy,
    [ConfigFileType.Spawn]: spawnStrategy
  };

  // --- MIDDLEWARES ---

  const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.UNAUTHORIZED).json({ error: SERVER_STRINGS.ERR_TOKEN_NOT_PROVIDED });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.UNAUTHORIZED).json({ error: SERVER_STRINGS.ERR_INVALID_TOKEN_FORMAT });
    }

    try {
      const decoded = authenticateUseCase.verify(token);
      req.user = decoded;
      next();
    } catch (err) {
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.FORBIDDEN).json({ error: SERVER_STRINGS.ERR_INVALID_OR_EXPIRED_TOKEN });
    }
  };

  // --- RUTAS ---

  // Login
  app.post(SERVER_CONSTANTS.ROUTES.LOGIN, (req: Request, res: Response) => {
    const { password } = req.body;
    try {
      const result = authenticateUseCase.execute(password);
      return res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.UNAUTHORIZED).json({ error: message });
    }
  });

  // Verify Token
  app.get(SERVER_CONSTANTS.ROUTES.VERIFY, authenticate, (req: Request, res: Response) => {
    return res.json({ valid: true });
  });

  // Server Status
  app.get(SERVER_CONSTANTS.ROUTES.STATUS, authenticate, (req: Request, res: Response) => {
    return res.json(controlServerUseCase.getStatus());
  });

  // Server Process Control
  app.post(SERVER_CONSTANTS.ROUTES.CONTROL, authenticate, (req: Request, res: Response) => {
    const { action } = req.body as { action: string };
    try {
      const entry = ACTION_HANDLERS[action as ServerAction];
      if (!entry) {
        return res.status(SERVER_CONSTANTS.HTTP_STATUS.BAD_REQUEST).json({ error: SERVER_STRINGS.ERR_INVALID_ACTION });
      }
      const result = entry.handler(controlServerUseCase, req.body);
      if (result.error) return res.status(SERVER_CONSTANTS.HTTP_STATUS.BAD_REQUEST).json(result);
      return res.json({ message: entry.successMessage });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: message });
    }
  });

  // List available Steam branches (dynamic, non-blocking catalog)
  app.get(SERVER_CONSTANTS.ROUTES.BRANCHES, authenticate, async (_req: Request, res: Response) => {
    try {
      await listBranchesUseCase.refresh();
      const snapshot = listBranchesUseCase.getSnapshot();
      return res.json(snapshot);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: message });
    }
  });

  // List all PZ server instances + active id
  app.get(SERVER_CONSTANTS.ROUTES.INSTANCES, authenticate, async (_req: Request, res: Response) => {
    try {
      const registry = await instanceService.listInstances();
      return res.json(registry);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: message });
    }
  });

  // Create a new PZ server instance
  app.post(SERVER_CONSTANTS.ROUTES.INSTANCES, authenticate, async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const result = await instanceService.createInstance({
        name: String(body.name ?? '').trim(),
        branch: String(body.branch ?? ''),
        gamePort: Number(body.gamePort),
        rconPort: Number(body.rconPort),
        maxPlayers: Number(body.maxPlayers)
      });
      return res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.BAD_REQUEST).json({ error: message });
    }
  });

  // Mark an instance as the active one
  app.post(SERVER_CONSTANTS.ROUTES.INSTANCE_SELECT, authenticate, async (req: Request, res: Response) => {
    try {
      const instance = await instanceService.selectInstance(req.params.id);
      return res.json({ instance });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.BAD_REQUEST).json({ error: message });
    }
  });

  // Trigger SteamCMD install/update for an instance
  app.post(SERVER_CONSTANTS.ROUTES.INSTANCE_INSTALL, authenticate, async (req: Request, res: Response) => {
    try {
      const result = await instanceService.installInstance(req.params.id);
      return res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.BAD_REQUEST).json({ error: message });
    }
  });

  // Delete an instance (and its directory)
  app.delete(SERVER_CONSTANTS.ROUTES.INSTANCE_BY_ID, authenticate, async (req: Request, res: Response) => {
    try {
      await instanceService.deleteInstance(req.params.id);
      return res.json({ success: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.BAD_REQUEST).json({ error: message });
    }
  });

  // Migrate Zomboid/ from one instance to another
  app.post(SERVER_CONSTANTS.ROUTES.INSTANCE_MIGRATE, authenticate, async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const result = await instanceService.migrateUserData(
        String(body.sourceId ?? ''),
        String(body.targetId ?? req.params.id)
      );
      return res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.BAD_REQUEST).json({ error: message });
    }
  });

  // Backup management routes for a specific instance
  app.get('/api/instances/:id/backups', authenticate, async (req: Request, res: Response) => {
    try {
      const backups = await backupService.listBackups(req.params.id);
      return res.json(backups);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.BAD_REQUEST).json({ error: message });
    }
  });

  app.post('/api/instances/:id/backups', authenticate, async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as { note?: string };
      const backup = await backupService.createBackup(req.params.id, body.note);
      return res.json(backup);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.BAD_REQUEST).json({ error: message });
    }
  });

  app.post('/api/instances/:id/backups/:backupId/restore', authenticate, async (req: Request, res: Response) => {
    try {
      const result = await backupService.restoreBackup(req.params.id, req.params.backupId);
      return res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.BAD_REQUEST).json({ error: message });
    }
  });

  app.delete('/api/instances/:id/backups/:backupId', authenticate, async (req: Request, res: Response) => {
    try {
      await backupService.deleteBackup(req.params.id, req.params.backupId);
      return res.json({ success: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.BAD_REQUEST).json({ error: message });
    }
  });

  // Helper to resolve custom data path for a specific instance
  const resolveInstanceDataDir = async (instanceId: string): Promise<string | undefined> => {
    if (!instanceId || instanceId === 'active') return undefined;
    try {
      const registry = await instanceService.listInstances();
      const instance = registry.instances.find(i => i.id === instanceId);
      return instance ? instance.dataPath : undefined;
    } catch {
      return undefined;
    }
  };

  // Get key-value settings from server.ini (Instance-scoped)
  app.get('/api/instances/:id/config/settings', authenticate, async (req: Request, res: Response) => {
    try {
      const dataDir = await resolveInstanceDataDir(req.params.id);
      const parsedIni = manageConfigUseCase.getSettings(dataDir);
      const settings: Record<string, string> = {};
      parsedIni.forEach(item => {
        settings[item.key] = item.value;
      });
      return res.json(settings);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: message });
    }
  });

  // Save server.ini settings (Instance-scoped)
  app.post('/api/instances/:id/config/settings', authenticate, async (req: Request, res: Response) => {
    try {
      const dataDir = await resolveInstanceDataDir(req.params.id);
      const result = manageConfigUseCase.saveSettings(req.body, dataDir);
      return res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: message });
    }
  });

  // Get Raw File Contents (Instance-scoped)
  app.get('/api/instances/:id/config/raw/:type', authenticate, async (req: Request, res: Response) => {
    const { id, type } = req.params;
    try {
      const dataDir = await resolveInstanceDataDir(id);
      const content = manageConfigUseCase.getRawFile(type, dataDir);
      return res.json({ content });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: message });
    }
  });

  // Save Raw File Contents (Instance-scoped)
  app.post('/api/instances/:id/config/raw/:type', authenticate, async (req: Request, res: Response) => {
    const { id, type } = req.params;
    const { content } = req.body;
    if (content === undefined) {
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.BAD_REQUEST).json({ error: SERVER_STRINGS.ERR_CONTENT_NOT_PROVIDED });
    }
    try {
      const dataDir = await resolveInstanceDataDir(id);
      const result = manageConfigUseCase.saveRawFile(type, content, dataDir);
      return res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: message });
    }
  });

  // Get Parsed GUI Config Data (Instance-scoped)
  app.get('/api/instances/:id/config/parsed/:type', authenticate, async (req: Request, res: Response) => {
    const { id, type } = req.params;
    try {
      const dataDir = await resolveInstanceDataDir(id);
      const rawContent = manageConfigUseCase.getRawFile(type, dataDir);
      if (!rawContent) {
        return res.json({ data: null });
      }

      const parser = parsers[type];
      if (!parser) {
        return res.status(SERVER_CONSTANTS.HTTP_STATUS.BAD_REQUEST).json({ error: SERVER_STRINGS.ERR_UNSUPPORTED_GUI_TYPE });
      }

      return res.json({ data: parser.parse(rawContent) });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: message });
    }
  });

  // Save Parsed GUI Config Data (Instance-scoped)
  app.post('/api/instances/:id/config/parsed/:type', authenticate, async (req: Request, res: Response) => {
    const { id, type } = req.params;
    const { data } = req.body;
    if (data === undefined) {
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.BAD_REQUEST).json({ error: SERVER_STRINGS.ERR_DATA_NOT_PROVIDED });
    }

    try {
      const dataDir = await resolveInstanceDataDir(id);
      if (type === ConfigFileType.Ini) {
        manageConfigUseCase.saveSettings(data, dataDir);
        return res.json({ success: true });
      }

      const parser = parsers[type];
      if (!parser) {
        return res.status(SERVER_CONSTANTS.HTTP_STATUS.BAD_REQUEST).json({ error: SERVER_STRINGS.ERR_UNSUPPORTED_SERIALIZE_TYPE });
      }

      const rawContent = parser.serialize(data);
      const result = manageConfigUseCase.saveRawFile(type, rawContent, dataDir);
      return res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: message });
    }
  });

  // Get key-value settings from server.ini
  app.get(SERVER_CONSTANTS.ROUTES.SETTINGS, authenticate, (req: Request, res: Response) => {
    try {
      const parsedIni = manageConfigUseCase.getSettings();
      const settings: Record<string, string> = {};
      parsedIni.forEach(item => {
        settings[item.key] = item.value;
      });
      return res.json(settings);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: message });
    }
  });

  // Save server.ini settings
  app.post(SERVER_CONSTANTS.ROUTES.SETTINGS, authenticate, (req: Request, res: Response) => {
    try {
      const result = manageConfigUseCase.saveSettings(req.body);
      return res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: message });
    }
  });

  // Get Inactivity Panel Config
  app.get(SERVER_CONSTANTS.ROUTES.PANEL, authenticate, (req: Request, res: Response) => {
    try {
      return res.json(manageConfigUseCase.getPanelConfig());
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: message });
    }
  });

  // Save Inactivity Panel Config
  app.post(SERVER_CONSTANTS.ROUTES.PANEL, authenticate, (req: Request, res: Response) => {
    try {
      const cleanConfig: PanelConfig = manageConfigUseCase.savePanelConfig(req.body);
      controlServerUseCase.serverControlService.setPanelConfig(cleanConfig);
      return res.json({ success: true, config: cleanConfig });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: message });
    }
  });

  // Get Raw File Contents
  app.get(SERVER_CONSTANTS.ROUTES.RAW, authenticate, (req: Request, res: Response) => {
    const { type } = req.params;
    try {
      const content = manageConfigUseCase.getRawFile(type);
      return res.json({ content });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: message });
    }
  });

  // Save Raw File Contents
  app.post(SERVER_CONSTANTS.ROUTES.RAW, authenticate, (req: Request, res: Response) => {
    const { type } = req.params;
    const { content } = req.body;
    if (content === undefined) {
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.BAD_REQUEST).json({ error: SERVER_STRINGS.ERR_CONTENT_NOT_PROVIDED });
    }
    try {
      const result = manageConfigUseCase.saveRawFile(type, content);
      return res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: message });
    }
  });

  // Get Parsed GUI Config Data
  app.get(SERVER_CONSTANTS.ROUTES.PARSED, authenticate, (req: Request, res: Response) => {
    const { type } = req.params;
    try {
      const rawContent = manageConfigUseCase.getRawFile(type);
      if (!rawContent) {
        return res.json({ data: null });
      }

      const parser = parsers[type];
      if (!parser) {
        return res.status(SERVER_CONSTANTS.HTTP_STATUS.BAD_REQUEST).json({ error: SERVER_STRINGS.ERR_UNSUPPORTED_GUI_TYPE });
      }

      return res.json({ data: parser.parse(rawContent) });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: message });
    }
  });

  // Save Parsed GUI Config Data
  app.post(SERVER_CONSTANTS.ROUTES.PARSED, authenticate, (req: Request, res: Response) => {
    const { type } = req.params;
    const { data } = req.body;
    if (data === undefined) {
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.BAD_REQUEST).json({ error: SERVER_STRINGS.ERR_DATA_NOT_PROVIDED });
    }

    try {
      // INI saves through the settings use case
      if (type === ConfigFileType.Ini) {
        manageConfigUseCase.saveSettings(data);
        return res.json({ success: true });
      }

      const parser = parsers[type];
      if (!parser) {
        return res.status(SERVER_CONSTANTS.HTTP_STATUS.BAD_REQUEST).json({ error: SERVER_STRINGS.ERR_UNSUPPORTED_SERIALIZE_TYPE });
      }

      const rawContent = parser.serialize(data);
      const result = manageConfigUseCase.saveRawFile(type, rawContent);
      return res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: message });
    }
  });

  // Serve React index.html for UI SPA routes
  app.get('*', (req: Request, res: Response) => {
    return res.sendFile(path.join(clientDistPath, 'index.html'));
  });

  return app;
}
