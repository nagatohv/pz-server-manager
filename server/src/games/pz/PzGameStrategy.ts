import { IGameStrategy } from '../../domain/ports/IGameStrategy.js';

export const PZ_GAME_ID = 'pz';
export const PZ_DEFAULT_GAME_PORT = 16261;
export const PZ_DEFAULT_RCON_PORT = 27015;
export const PZ_DEFAULT_MAX_PLAYERS = 16;
export const PZ_STEAM_APP_ID = 380870;

export class PzGameStrategy implements IGameStrategy {
  readonly gameId = PZ_GAME_ID;
  readonly defaultName = 'Project Zomboid Server';
  readonly defaultGamePort = PZ_DEFAULT_GAME_PORT;
  readonly defaultRconPort = PZ_DEFAULT_RCON_PORT;
  readonly defaultMaxPlayers = PZ_DEFAULT_MAX_PLAYERS;

  getLaunchCommand(installPath: string, serverName: string, ports: { gamePort: number; rconPort: number }): string {
    return `./start-server.sh -servername ${serverName} -port ${ports.gamePort} -rconport ${ports.rconPort}`;
  }

  getSteamAppId(): number {
    return PZ_STEAM_APP_ID;
  }
}
