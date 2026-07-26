import { describe, it, expect } from 'vitest';
import IniParserStrategy from '../adapters/parsers/IniParserStrategy.js';

describe('IniParserStrategy', () => {
  const strategy = new IniParserStrategy();

  it('should parse simple key-value properties with comments as description', () => {
    const raw = '# This is a comment\nMaxPlayers=16\nPVP=true\n';
    const parsed = strategy.parse(raw);
    
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toEqual({
      key: 'MaxPlayers',
      value: '16',
      description: 'This is a comment'
    });
    expect(parsed[1]).toEqual({
      key: 'PVP',
      value: 'true',
      description: ''
    });
  });

  it('should serialize updated key value properties preserving original comment structure', () => {
    const raw = '# Comment here\nMaxPlayers=16\n';
    const data = { MaxPlayers: '32' };
    const serialized = strategy.serialize(data, raw);
    expect(serialized).toContain('# Comment here');
    expect(serialized).toContain('MaxPlayers=32');
  });
});
