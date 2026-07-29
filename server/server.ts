import http from 'http';
import systemConfig from './src/config/system-config.js';
import { SERVER_CONSTANTS } from './src/config/constants.js';
import { SERVER_STRINGS } from './src/config/strings.js';

// Parsers Strategies
import IniParserStrategy from './src/adapters/parsers/IniParserStrategy.js';
import SandboxParserStrategy from './src/adapters/parsers/SandboxParserStrategy.js';
import SpawnParserStrategy from './src/adapters/parsers/SpawnParserStrategy.js';

// Repositories & Services
import PzConfigRepository from './src/adapters/repositories/PzConfigRepository.js';
import { PzInstanceRepository } from './src/adapters/repositories/PzInstanceRepository.js';
import { getProcessControlService } from './src/adapters/services/PzProcessControlService.js';
import { getSteamBranchCatalogService } from './src/adapters/services/SteamBranchCatalogService.js';
import { PzInstanceService } from './src/adapters/services/PzInstanceService.js';
import { PzBackupService } from './src/adapters/services/PzBackupService.js';
import JwtAuthService from './src/adapters/security/JwtAuthService.js';
import { BranchClassifier } from './src/adapters/parsers/BranchClassifier.js';

// Use Cases
import AuthenticateUseCase from './src/usecases/AuthenticateUseCase.js';
import ControlServerUseCase from './src/usecases/ControlServerUseCase.js';
import ManageConfigUseCase from './src/usecases/ManageConfigUseCase.js';
import ListBranchesUseCase from './src/usecases/ListBranchesUseCase.js';

// Frameworks & Drivers
import createExpressApp from './src/frameworks/express/express-app.js';
import initWebSocketServer from './src/frameworks/websocket/websocket-server.js';

// 1. Instanciar estrategias de parseo (Strategy Pattern)
const iniStrategy = new IniParserStrategy();
const sandboxStrategy = new SandboxParserStrategy();
const spawnStrategy = new SpawnParserStrategy();

// 2. Instanciar repositorios y servicios externos con DIP (Dependency Inversion Principle)
const configRepository = new PzConfigRepository(
  systemConfig,
  iniStrategy,
  sandboxStrategy,
  spawnStrategy
);
const serverControlService = getProcessControlService(systemConfig, configRepository);
const branchClassifier = new BranchClassifier({
  defaultBranchNames: SERVER_CONSTANTS.STEAM_DEFAULT_BRANCHES,
  unstableKeywords: SERVER_CONSTANTS.STEAM_UNSTABLE_KEYWORDS
});
const branchCatalogService = getSteamBranchCatalogService(
  systemConfig,
  branchClassifier,
  {
    fallbackBranches: SERVER_CONSTANTS.STEAM_FALLBACK_BRANCHES,
    log: (line) => serverControlService.appendExternalLog(line)
  }
);
const instanceRepository = new PzInstanceRepository(systemConfig.DATA_DIR);
const instanceService = new PzInstanceService({
  dataDir: systemConfig.DATA_DIR,
  repository: instanceRepository,
  onLog: (line: string) => serverControlService.appendExternalLog(line)
});
const backupService = new PzBackupService({
  dataDir: systemConfig.DATA_DIR,
  repository: instanceRepository,
  onLog: (line: string) => serverControlService.appendExternalLog(line)
});
const authService = new JwtAuthService(systemConfig);

// 3. Instanciar Casos de Uso orquestadores
const authenticateUseCase = new AuthenticateUseCase(authService);
const controlServerUseCase = new ControlServerUseCase(serverControlService);
const manageConfigUseCase = new ManageConfigUseCase(configRepository);
const listBranchesUseCase = new ListBranchesUseCase(branchCatalogService);

// 4. Configurar Servidor HTTP y Express App
const app = createExpressApp(
  authenticateUseCase,
  controlServerUseCase,
  manageConfigUseCase,
  listBranchesUseCase,
  instanceService,
  iniStrategy,
  sandboxStrategy,
  spawnStrategy,
  backupService
);
const server = http.createServer(app);

// 5. Vincular Servidor WebSocket con patrón Observer
initWebSocketServer(server, authenticateUseCase, controlServerUseCase, listBranchesUseCase);

// 6. Arrancar servidor de forma asíncrona cargando el servidor activo primero
(async () => {
  try {
    const activeInstance = await instanceRepository.getActive();
    if (activeInstance) {
      systemConfig.PZ_SERVER_DIR = activeInstance.installPath;
      systemConfig.ZO_USER_DIR = activeInstance.dataPath;
      console.log(`[BOOT] Active instance loaded: ${activeInstance.name}`);
    }
  } catch (err) {
    console.error('[BOOT] Failed to load active instance:', err);
  }

  server.listen(systemConfig.PORT, SERVER_CONSTANTS.DEFAULT_HOST, () => {
    console.log(
      SERVER_STRINGS.MSG_PORTAL_RUNNING
        .replace('{host}', SERVER_CONSTANTS.DEFAULT_HOST)
        .replace('{port}', String(systemConfig.PORT))
    );
  });
})();

export { server };
