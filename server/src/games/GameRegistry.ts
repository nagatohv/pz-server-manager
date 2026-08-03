import { IGameStrategy } from '../domain/ports/IGameStrategy.js';
import { PzGameStrategy } from './pz/PzGameStrategy.js';

export class GameRegistry {
  private readonly strategies = new Map<string, IGameStrategy>();

  constructor() {
    this.register(new PzGameStrategy());
  }

  register(strategy: IGameStrategy): void {
    this.strategies.set(strategy.gameId, strategy);
  }

  get(gameId: string): IGameStrategy {
    const strategy = this.strategies.get(gameId);
    if (!strategy) {
      // Fallback to PZ strategy if game not found
      return this.strategies.get('pz')!;
    }
    return strategy;
  }

  listSupportedGames(): string[] {
    return Array.from(this.strategies.keys());
  }
}

export const defaultGameRegistry = new GameRegistry();
