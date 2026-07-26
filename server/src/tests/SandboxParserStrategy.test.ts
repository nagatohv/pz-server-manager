import { describe, it, expect } from 'vitest';
import SandboxParserStrategy from '../adapters/parsers/SandboxParserStrategy.js';

describe('SandboxParserStrategy', () => {
  const strategy = new SandboxParserStrategy();

  it('should parse Lua table SandboxVars with keys, groups and comment options', () => {
    const raw = `
SandboxVars = {
    -- 1 - Insane
    -- 2 - High
    Zombies = 2,
    ZombieConfig = {
        Speed = 3,
    }
}
`;
    const parsed = strategy.parse(raw);
    expect(parsed.values).toEqual({
      Zombies: 2,
      ZombieConfig: {
        Speed: 3
      }
    });
    expect(parsed.options['Zombies']).toEqual([
      { value: 1, label: '1 - Insane' },
      { value: 2, label: '2 - High' }
    ]);
  });

  it('should serialize simple object to SandboxVars Lua format', () => {
    const data = {
      values: {
        Zombies: 2,
        ZombieConfig: {
          Speed: 3
        }
      }
    };
    const serialized = strategy.serialize(data);
    expect(serialized).toContain('SandboxVars = {');
    expect(serialized).toContain('Zombies = 2,');
    expect(serialized).toContain('Speed = 3,');
  });
});
