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
import { getProcessControlService } from './src/adapters/services/PzProcessControlService.js';
import JwtAuthService from './src/adapters/security/JwtAuthService.js';

// Use Cases
import AuthenticateUseCase from './src/usecases/AuthenticateUseCase.js';
import ControlServerUseCase from './src/usecases/ControlServerUseCase.js';
import ManageConfigUseCase from './src/usecases/ManageConfigUseCase.js';

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
const authService = new JwtAuthService(systemConfig);

// 3. Instanciar Casos de Uso orquestadores
const authenticateUseCase = new AuthenticateUseCase(authService);
const controlServerUseCase = new ControlServerUseCase(serverControlService);
const manageConfigUseCase = new ManageConfigUseCase(configRepository);

// 4. Configurar Servidor HTTP y Express App
const app = createExpressApp(
  authenticateUseCase,
  controlServerUseCase,
  manageConfigUseCase,
  iniStrategy,
  sandboxStrategy,
  spawnStrategy
);
const server = http.createServer(app);

// 5. Vincular Servidor WebSocket con patrón Observer
initWebSocketServer(server, authenticateUseCase, controlServerUseCase);

// 6. Arrancar servidor
server.listen(systemConfig.PORT, SERVER_CONSTANTS.DEFAULT_HOST, () => {
  console.log(
    SERVER_STRINGS.MSG_PORTAL_RUNNING
      .replace('{host}', SERVER_CONSTANTS.DEFAULT_HOST)
      .replace('{port}', String(systemConfig.PORT))
  );
});
export { server };
