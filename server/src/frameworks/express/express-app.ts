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
import { AppError } from '../../domain/AppError.js';
import { ERROR_CODES } from '../../config/errorCodes.js';
import { SERVER_STRINGS } from '../../config/strings.js';
import { SERVER_CONSTANTS } from '../../config/constants.js';
import { ServerAction, ConfigFileType } from '../../types.js';
import type { AuthTokenPayload, ControlResult, PanelConfig } from '../../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = process.env.NODE_ENV === 'production' || __dirname.endsWith('dist') || !__dirname.includes('src');
const clientDistPath = isProduction
  ? path.resolve(__dirname, '../../client/dist')
  : path.resolve(__dirname, '../../../../client/dist');

interface AuthenticatedRequest extends Request {
  user?: AuthTokenPayload;
}

const ACTION_HANDLERS: Record<ServerAction, {
  handler: (uc: ControlServerUseCase, body: Record<string, string>) => ControlResult;
  successMessage: string;
}> = {
  [ServerAction.Start]:   { handler: (uc) => uc.start(),              successMessage: SERVER_STRINGS.MSG_ACTION_START },
  [ServerAction.Stop]:    { handler: (uc) => uc.stop(),               successMessage: SERVER_STRINGS.MSG_ACTION_STOP },
  [ServerAction.Restart]: { handler: (uc) => uc.restart(),            successMessage: SERVER_STRINGS.MSG_ACTION_RESTART },
  [ServerAction.Kill]:    { handler: (uc) => uc.kill(),               successMessage: SERVER_STRINGS.MSG_ACTION_KILL },
  [ServerAction.Update]:  { handler: (uc, b) => uc.update(b.branch),  successMessage: SERVER_STRINGS.MSG_ACTION_UPDATE },
  [ServerAction.Command]: { handler: (uc, b) => uc.sendCommand(b.command), successMessage: SERVER_STRINGS.MSG_ACTION_COMMAND }
};

type ParserMap = Record<string, IniParserStrategy | SandboxParserStrategy | SpawnParserStrategy>;

import IPzBackupService from '../../domain/ports/IPzBackupService.js';
import { PzBackupService } from '../../adapters/services/PzBackupService.js';

const buildErrorPayload = (err: unknown): { code: string; error: string } => {
  if (err instanceof AppError) {
    return { code: err.code, error: err.message };
  }
  const message = err instanceof Error ? err.message : String(err);
  return { code: ERROR_CODES.ERR_SAVE_FILE_FAILED, error: message };
};

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

  const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.UNAUTHORIZED).json({
        code: ERROR_CODES.ERR_TOKEN_NOT_PROVIDED,
        error: SERVER_STRINGS.ERR_TOKEN_NOT_PROVIDED
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.UNAUTHORIZED).json({
        code: ERROR_CODES.ERR_INVALID_TOKEN_FORMAT,
        error: SERVER_STRINGS.ERR_INVALID_TOKEN_FORMAT
      });
    }

    try {
      const decoded = authenticateUseCase.verify(token);
      req.user = decoded;
      next();
    } catch (err) {
      if (err instanceof AppError) {
        return res.status(SERVER_CONSTANTS.HTTP_STATUS.FORBIDDEN).json({
          code: err.code,
          error: err.message
        });
      }
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.FORBIDDEN).json({
        code: ERROR_CODES.ERR_INVALID_OR_EXPIRED_TOKEN,
        error: SERVER_STRINGS.ERR_INVALID_OR_EXPIRED_TOKEN
      });
    }
  };

  app.post(SERVER_CONSTANTS.ROUTES.LOGIN, (req: Request, res: Response) => {
    const { password } = req.body;
    try {
      const result = authenticateUseCase.execute(password);
      return res.json(result);
    } catch (err) {
      if (err instanceof AppError) {
        return res.status(SERVER_CONSTANTS.HTTP_STATUS.UNAUTHORIZED).json({
          code: err.code,
          error: err.message
        });
      }
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.UNAUTHORIZED).json(buildErrorPayload(err));
    }
  });

  app.get(SERVER_CONSTANTS.ROUTES.VERIFY, authenticate, (req: Request, res: Response) => {
    return res.json({ valid: true });
  });

  app.get(SERVER_CONSTANTS.ROUTES.STATUS, authenticate, (req: Request, res: Response) => {
    return res.json(controlServerUseCase.getStatus());
  });

  app.post(SERVER_CONSTANTS.ROUTES.CONTROL, authenticate, (req: Request, res: Response) => {
    const { action } = req.body as { action: string };
    try {
      const entry = ACTION_HANDLERS[action as ServerAction];
      if (!entry) {
        return res.status(SERVER_CONSTANTS.HTTP_STATUS.BAD_REQUEST).json({
          code: ERROR_CODES.ERR_INVALID_ACTION,
          error: SERVER_STRINGS.ERR_INVALID_ACTION
        });
      }
      const result = entry.handler(controlServerUseCase, req.body);
      if (result.error) {
        return res.status(SERVER_CONSTANTS.HTTP_STATUS.BAD_REQUEST).json({
          code: result.code ?? ERROR_CODES.ERR_INVALID_ACTION,
          error: result.error
        });
      }
      return res.json({ message: entry.successMessage });
    } catch (err) {
      if (err instanceof AppError) {
        return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          code: err.code,
          error: err.message
        });
      }
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json(buildErrorPayload(err));
    }
  });

  app.get(SERVER_CONSTANTS.ROUTES.BRANCHES, authenticate, async (_req: Request, res: Response) => {
    try {
      await listBranchesUseCase.refresh();
      const snapshot = listBranchesUseCase.getSnapshot();
      return res.json(snapshot);
    } catch (err) {
      if (err instanceof AppError) {
        return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          code: err.code,
          error: err.message
        });
      }
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json(buildErrorPayload(err));
    }
  });

  app.get(SERVER_CONSTANTS.ROUTES.INSTANCES, authenticate, async (_req: Request, res: Response) => {
    try {
      const registry = await instanceService.listInstances();
      return res.json(registry);
    } catch (err) {
      if (err instanceof AppError) {
        return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          code: err.code,
          error: err.message
        });
      }
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json(buildErrorPayload(err));
    }
  });

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
    } catch (err) {
      if (err instanceof AppError) {
        return res.status(SERVER_CONSTANTS.HTTP_STATUS.BAD_REQUEST).json({
          code: err.code,
          error: err.message
        });
      }
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.BAD_REQUEST).json(buildErrorPayload(err));
    }
  });

  app.post(SERVER_CONSTANTS.ROUTES.INSTANCE_SELECT, authenticate, async (req: Request, res: Response) => {
    try {
      const instance = await instanceService.selectInstance(req.params.id);
      return res.json({ instance });
    } catch (err) {
      if (err instanceof AppError) {
        return res.status(SERVER_CONSTANTS.HTTP_STATUS.BAD_REQUEST).json({
          code: err.code,
          error: err.message
        });
      }
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.BAD_REQUEST).json(buildErrorPayload(err));
    }
  });

  app.post(SERVER_CONSTANTS.ROUTES.INSTANCE_INSTALL, authenticate, async (req: Request, res: Response) => {
    try {
      const result = await instanceService.installInstance(req.params.id);
      return res.json(result);
    } catch (err) {
      if (err instanceof AppError) {
        return res.status(SERVER_CONSTANTS.HTTP_STATUS.BAD_REQUEST).json({
          code: err.code,
          error: err.message
        });
      }
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.BAD_REQUEST).json(buildErrorPayload(err));
    }
  });

  app.delete(SERVER_CONSTANTS.ROUTES.INSTANCE_BY_ID, authenticate, async (req: Request, res: Response) => {
    try {
      await instanceService.deleteInstance(req.params.id);
      return res.json({ success: true });
    } catch (err) {
      if (err instanceof AppError) {
        return res.status(SERVER_CONSTANTS.HTTP_STATUS.BAD_REQUEST).json({
          code: err.code,
          error: err.message
        });
      }
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.BAD_REQUEST).json(buildErrorPayload(err));
    }
  });

  app.post(SERVER_CONSTANTS.ROUTES.INSTANCE_MIGRATE, authenticate, async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const result = await instanceService.migrateUserData(
        String(body.sourceId ?? ''),
        String(body.targetId ?? req.params.id)
      );
      return res.json(result);
    } catch (err) {
      if (err instanceof AppError) {
        return res.status(SERVER_CONSTANTS.HTTP_STATUS.BAD_REQUEST).json({
          code: err.code,
          error: err.message
        });
      }
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.BAD_REQUEST).json(buildErrorPayload(err));
    }
  });

  app.get('/api/instances/:id/backups', authenticate, async (req: Request, res: Response) => {
    try {
      const backups = await backupService.listBackups(req.params.id);
      return res.json(backups);
    } catch (err) {
      if (err instanceof AppError) {
        return res.status(SERVER_CONSTANTS.HTTP_STATUS.BAD_REQUEST).json({
          code: err.code,
          error: err.message
        });
      }
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.BAD_REQUEST).json(buildErrorPayload(err));
    }
  });

  app.post('/api/instances/:id/backups', authenticate, async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as { note?: string };
      const backup = await backupService.createBackup(req.params.id, body.note);
      return res.json(backup);
    } catch (err) {
      if (err instanceof AppError) {
        return res.status(SERVER_CONSTANTS.HTTP_STATUS.BAD_REQUEST).json({
          code: err.code,
          error: err.message
        });
      }
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.BAD_REQUEST).json(buildErrorPayload(err));
    }
  });

  app.post('/api/instances/:id/backups/:backupId/restore', authenticate, async (req: Request, res: Response) => {
    try {
      const result = await backupService.restoreBackup(req.params.id, req.params.backupId);
      return res.json(result);
    } catch (err) {
      if (err instanceof AppError) {
        return res.status(SERVER_CONSTANTS.HTTP_STATUS.BAD_REQUEST).json({
          code: err.code,
          error: err.message
        });
      }
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.BAD_REQUEST).json(buildErrorPayload(err));
    }
  });

  app.delete('/api/instances/:id/backups/:backupId', authenticate, async (req: Request, res: Response) => {
    try {
      await backupService.deleteBackup(req.params.id, req.params.backupId);
      return res.json({ success: true });
    } catch (err) {
      if (err instanceof AppError) {
        return res.status(SERVER_CONSTANTS.HTTP_STATUS.BAD_REQUEST).json({
          code: err.code,
          error: err.message
        });
      }
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.BAD_REQUEST).json(buildErrorPayload(err));
    }
  });

  app.post(SERVER_CONSTANTS.ROUTES.INSTANCE_CLEANUP, authenticate, async (req: Request, res: Response) => {
    try {
      const result = await instanceService.cleanupInstance(req.params.id);
      return res.json(result);
    } catch (err) {
      if (err instanceof AppError) {
        return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          code: err.code,
          error: err.message
        });
      }
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json(buildErrorPayload(err));
    }
  });

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

  app.get('/api/instances/:id/config/settings', authenticate, async (req: Request, res: Response) => {
    try {
      const dataDir = await resolveInstanceDataDir(req.params.id);
      const parsedIni = manageConfigUseCase.getSettings(dataDir);
      const settings: Record<string, string> = {};
      parsedIni.forEach(item => {
        settings[item.key] = item.value;
      });
      return res.json(settings);
    } catch (err) {
      if (err instanceof AppError) {
        return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          code: err.code,
          error: err.message
        });
      }
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json(buildErrorPayload(err));
    }
  });

  app.post('/api/instances/:id/config/settings', authenticate, async (req: Request, res: Response) => {
    try {
      const dataDir = await resolveInstanceDataDir(req.params.id);
      const result = manageConfigUseCase.saveSettings(req.body, dataDir);
      return res.json(result);
    } catch (err) {
      if (err instanceof AppError) {
        return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          code: err.code,
          error: err.message
        });
      }
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json(buildErrorPayload(err));
    }
  });

  app.get('/api/instances/:id/config/panel', authenticate, async (req: Request, res: Response) => {
    try {
      const dataDir = await resolveInstanceDataDir(req.params.id);
      return res.json(manageConfigUseCase.getPanelConfig(dataDir));
    } catch (err) {
      if (err instanceof AppError) {
        return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          code: err.code,
          error: err.message
        });
      }
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json(buildErrorPayload(err));
    }
  });

  app.post('/api/instances/:id/config/panel', authenticate, async (req: Request, res: Response) => {
    try {
      const dataDir = await resolveInstanceDataDir(req.params.id);
      const cleanConfig: PanelConfig = manageConfigUseCase.savePanelConfig(req.body, dataDir);

      const activeInstance = await instanceService.listInstances();
      if (activeInstance.activeInstanceId === req.params.id) {
        controlServerUseCase.serverControlService.setPanelConfig(cleanConfig);
      }

      return res.json({ success: true, config: cleanConfig });
    } catch (err) {
      if (err instanceof AppError) {
        return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          code: err.code,
          error: err.message
        });
      }
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json(buildErrorPayload(err));
    }
  });

  app.get('/api/instances/:id/config/raw/:type', authenticate, async (req: Request, res: Response) => {
    const { id, type } = req.params;
    try {
      const dataDir = await resolveInstanceDataDir(id);
      const content = manageConfigUseCase.getRawFile(type, dataDir);
      return res.json({ content });
    } catch (err) {
      if (err instanceof AppError) {
        return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          code: err.code,
          error: err.message
        });
      }
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json(buildErrorPayload(err));
    }
  });

  app.post('/api/instances/:id/config/raw/:type', authenticate, async (req: Request, res: Response) => {
    const { id, type } = req.params;
    const { content } = req.body;
    if (content === undefined) {
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.BAD_REQUEST).json({
        code: ERROR_CODES.ERR_CONTENT_NOT_PROVIDED,
        error: SERVER_STRINGS.ERR_CONTENT_NOT_PROVIDED
      });
    }
    try {
      const dataDir = await resolveInstanceDataDir(id);
      const result = manageConfigUseCase.saveRawFile(type, content, dataDir);
      return res.json(result);
    } catch (err) {
      if (err instanceof AppError) {
        return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          code: err.code,
          error: err.message
        });
      }
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json(buildErrorPayload(err));
    }
  });

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
        return res.status(SERVER_CONSTANTS.HTTP_STATUS.BAD_REQUEST).json({
          code: ERROR_CODES.ERR_UNSUPPORTED_GUI_TYPE,
          error: SERVER_STRINGS.ERR_UNSUPPORTED_GUI_TYPE
        });
      }

      return res.json({ data: parser.parse(rawContent) });
    } catch (err) {
      if (err instanceof AppError) {
        return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          code: err.code,
          error: err.message
        });
      }
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json(buildErrorPayload(err));
    }
  });

  app.post('/api/instances/:id/config/parsed/:type', authenticate, async (req: Request, res: Response) => {
    const { id, type } = req.params;
    const { data } = req.body;
    if (data === undefined) {
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.BAD_REQUEST).json({
        code: ERROR_CODES.ERR_DATA_NOT_PROVIDED,
        error: SERVER_STRINGS.ERR_DATA_NOT_PROVIDED
      });
    }

    try {
      const dataDir = await resolveInstanceDataDir(id);
      if (type === ConfigFileType.Ini) {
        manageConfigUseCase.saveSettings(data, dataDir);
        return res.json({ success: true });
      }

      const parser = parsers[type];
      if (!parser) {
        return res.status(SERVER_CONSTANTS.HTTP_STATUS.BAD_REQUEST).json({
          code: ERROR_CODES.ERR_UNSUPPORTED_SERIALIZE_TYPE,
          error: SERVER_STRINGS.ERR_UNSUPPORTED_SERIALIZE_TYPE
        });
      }

      const rawContent = parser.serialize(data);
      const result = manageConfigUseCase.saveRawFile(type, rawContent, dataDir);
      return res.json(result);
    } catch (err) {
      if (err instanceof AppError) {
        return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          code: err.code,
          error: err.message
        });
      }
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json(buildErrorPayload(err));
    }
  });

  app.get(SERVER_CONSTANTS.ROUTES.SETTINGS, authenticate, (req: Request, res: Response) => {
    try {
      const parsedIni = manageConfigUseCase.getSettings();
      const settings: Record<string, string> = {};
      parsedIni.forEach(item => {
        settings[item.key] = item.value;
      });
      return res.json(settings);
    } catch (err) {
      if (err instanceof AppError) {
        return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          code: err.code,
          error: err.message
        });
      }
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json(buildErrorPayload(err));
    }
  });

  app.post(SERVER_CONSTANTS.ROUTES.SETTINGS, authenticate, (req: Request, res: Response) => {
    try {
      const result = manageConfigUseCase.saveSettings(req.body);
      return res.json(result);
    } catch (err) {
      if (err instanceof AppError) {
        return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          code: err.code,
          error: err.message
        });
      }
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json(buildErrorPayload(err));
    }
  });

  app.get(SERVER_CONSTANTS.ROUTES.PANEL, authenticate, (req: Request, res: Response) => {
    try {
      return res.json(manageConfigUseCase.getPanelConfig());
    } catch (err) {
      if (err instanceof AppError) {
        return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          code: err.code,
          error: err.message
        });
      }
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json(buildErrorPayload(err));
    }
  });

  app.post(SERVER_CONSTANTS.ROUTES.PANEL, authenticate, (req: Request, res: Response) => {
    try {
      const cleanConfig: PanelConfig = manageConfigUseCase.savePanelConfig(req.body);
      controlServerUseCase.serverControlService.setPanelConfig(cleanConfig);
      return res.json({ success: true, config: cleanConfig });
    } catch (err) {
      if (err instanceof AppError) {
        return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          code: err.code,
          error: err.message
        });
      }
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json(buildErrorPayload(err));
    }
  });

  app.get(SERVER_CONSTANTS.ROUTES.RAW, authenticate, (req: Request, res: Response) => {
    const { type } = req.params;
    try {
      const content = manageConfigUseCase.getRawFile(type);
      return res.json({ content });
    } catch (err) {
      if (err instanceof AppError) {
        return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          code: err.code,
          error: err.message
        });
      }
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json(buildErrorPayload(err));
    }
  });

  app.post(SERVER_CONSTANTS.ROUTES.RAW, authenticate, (req: Request, res: Response) => {
    const { type } = req.params;
    const { content } = req.body;
    if (content === undefined) {
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.BAD_REQUEST).json({
        code: ERROR_CODES.ERR_CONTENT_NOT_PROVIDED,
        error: SERVER_STRINGS.ERR_CONTENT_NOT_PROVIDED
      });
    }
    try {
      const result = manageConfigUseCase.saveRawFile(type, content);
      return res.json(result);
    } catch (err) {
      if (err instanceof AppError) {
        return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          code: err.code,
          error: err.message
        });
      }
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json(buildErrorPayload(err));
    }
  });

  app.get(SERVER_CONSTANTS.ROUTES.PARSED, authenticate, (req: Request, res: Response) => {
    const { type } = req.params;
    try {
      const rawContent = manageConfigUseCase.getRawFile(type);
      if (!rawContent) {
        return res.json({ data: null });
      }

      const parser = parsers[type];
      if (!parser) {
        return res.status(SERVER_CONSTANTS.HTTP_STATUS.BAD_REQUEST).json({
          code: ERROR_CODES.ERR_UNSUPPORTED_GUI_TYPE,
          error: SERVER_STRINGS.ERR_UNSUPPORTED_GUI_TYPE
        });
      }

      return res.json({ data: parser.parse(rawContent) });
    } catch (err) {
      if (err instanceof AppError) {
        return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          code: err.code,
          error: err.message
        });
      }
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json(buildErrorPayload(err));
    }
  });

  app.post(SERVER_CONSTANTS.ROUTES.PARSED, authenticate, (req: Request, res: Response) => {
    const { type } = req.params;
    const { data } = req.body;
    if (data === undefined) {
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.BAD_REQUEST).json({
        code: ERROR_CODES.ERR_DATA_NOT_PROVIDED,
        error: SERVER_STRINGS.ERR_DATA_NOT_PROVIDED
      });
    }

    try {
      if (type === ConfigFileType.Ini) {
        manageConfigUseCase.saveSettings(data);
        return res.json({ success: true });
      }

      const parser = parsers[type];
      if (!parser) {
        return res.status(SERVER_CONSTANTS.HTTP_STATUS.BAD_REQUEST).json({
          code: ERROR_CODES.ERR_UNSUPPORTED_SERIALIZE_TYPE,
          error: SERVER_STRINGS.ERR_UNSUPPORTED_SERIALIZE_TYPE
        });
      }

      const rawContent = parser.serialize(data);
      const result = manageConfigUseCase.saveRawFile(type, rawContent);
      return res.json(result);
    } catch (err) {
      if (err instanceof AppError) {
        return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          code: err.code,
          error: err.message
        });
      }
      return res.status(SERVER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json(buildErrorPayload(err));
    }
  });

  app.get('*', (req: Request, res: Response) => {
    return res.sendFile(path.join(clientDistPath, 'index.html'));
  });

  return app;
}
