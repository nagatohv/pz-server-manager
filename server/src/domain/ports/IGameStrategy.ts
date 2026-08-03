/**
  * Contrato de estrategia para soportar motores de juegos específicos de forma extensible.
  */
export interface IGameStrategy {
  readonly gameId: string;
  readonly defaultName: string;
  readonly defaultGamePort: number;
  readonly defaultRconPort: number;
  readonly defaultMaxPlayers: number;

  getLaunchCommand(installPath: string, serverName: string, ports: { gamePort: number; rconPort: number }): string;
  getSteamAppId(): number;
}
