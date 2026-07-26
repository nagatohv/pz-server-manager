import { describe, it, expect } from 'vitest';
import SpawnParserStrategy from '../adapters/parsers/SpawnParserStrategy.js';

describe('SpawnParserStrategy', () => {
  const strategy = new SpawnParserStrategy();

  it('should parse SpawnRegions Lua block', () => {
    const raw = `
function SpawnRegions()
\treturn {
\t\t{ name = "Muldraugh, KY", file = "media/maps/Muldraugh, KY/spawnpoints.lua" },
\t\t--{ name = "Riverside, KY", file = "media/maps/Riverside, KY/spawnpoints.lua" },
\t}
end
`;
    const parsed = strategy.parse(raw);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toEqual({
      name: 'Muldraugh, KY',
      file: 'media/maps/Muldraugh, KY/spawnpoints.lua',
      isCommented: false
    });
    expect(parsed[1]).toEqual({
      name: 'Riverside, KY',
      file: 'media/maps/Riverside, KY/spawnpoints.lua',
      isCommented: true
    });
  });

  it('should serialize spawn regions array back to Lua', () => {
    const data = [
      { name: 'Muldraugh, KY', file: 'media/maps/Muldraugh, KY/spawnpoints.lua', isCommented: false },
      { name: 'Riverside, KY', file: 'media/maps/Riverside, KY/spawnpoints.lua', isCommented: true }
    ];
    const serialized = strategy.serialize(data);
    expect(serialized).toContain('function SpawnRegions()');
    expect(serialized).toContain('{ name = "Muldraugh, KY", file = "media/maps/Muldraugh, KY/spawnpoints.lua" },');
    expect(serialized).toContain('--{ name = "Riverside, KY", file = "media/maps/Riverside, KY/spawnpoints.lua" },');
  });
});
