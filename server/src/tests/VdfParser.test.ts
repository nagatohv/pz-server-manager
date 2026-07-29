import { describe, it, expect } from 'vitest';
import { parseVdf, VdfParseError } from '../adapters/parsers/VdfParser.js';

describe('VdfParser', () => {
  it('parses a flat object with string values', () => {
    const result = parseVdf('"name" "Project Zomboid" "id" "380870"');
    expect(result).toEqual({ name: 'Project Zomboid', id: '380870' });
  });

  it('parses nested objects and unwraps the leading root key', () => {
    const vdf = `
      "380870"
      {
        "common"
        {
          "name" "Project Zomboid"
        }
        "branches"
        {
          "public"
          {
            "buildid"     "1234567"
            "timeupdated" "1700000000"
          }
          "unstable"
          {
            "buildid"     "7654321"
            "timeupdated" "1700000999"
            "description" "Latest unstable"
          }
        }
      }
    `;
    const result = parseVdf(vdf);
    expect(result['branches']).toBeDefined();
    const branches = result['branches'] as Record<string, Record<string, string>>;
    expect(branches['public']).toEqual({ buildid: '1234567', timeupdated: '1700000000' });
    expect(branches['unstable']).toEqual({
      buildid: '7654321',
      timeupdated: '1700000999',
      description: 'Latest unstable'
    });
  });

  it('ignores // line comments and extra whitespace', () => {
    const vdf = `
      // Leading comment
      "appid" "380870"   // trailing comment
      "name"  "Zomboid"
    `;
    const result = parseVdf(vdf);
    expect(result).toEqual({ appid: '380870', name: 'Zomboid' });
  });

  it('supports escaped characters inside quoted strings', () => {
    const result = parseVdf('"desc" "Línea\\ncon\\tsaltos"');
    expect(result).toEqual({ desc: 'Línea\ncon\tsaltos' });
  });

  it('skips Steam prompt preamble before the root key', () => {
    const vdf = `Steam>\nLoading Steam API...done.\n\n"380870"\n{\n  "name" "X"\n}\n`;
    const result = parseVdf(vdf);
    expect(result).toEqual({ name: 'X' });
  });

  it('parses a brace-rooted document without a leading root key', () => {
    const vdf = '{ "name" "X" "id" "380870" }';
    const result = parseVdf(vdf);
    expect(result).toEqual({ name: 'X', id: '380870' });
  });

  it('exposes the VdfParseError position when the document is truncated', () => {
    try {
      parseVdf('"key" { "inner" "value"');
      throw new Error('expected parser to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(VdfParseError);
      expect((err as VdfParseError).position).toBeGreaterThan(0);
      expect((err as VdfParseError).name).toBe('VdfParseError');
    }
  });

  it('throws VdfParseError when input is empty', () => {
    expect(() => parseVdf('')).toThrow(VdfParseError);
  });

  it('throws VdfParseError when braces are unbalanced', () => {
    expect(() => parseVdf('"key" { "inner" "value"')).toThrow(VdfParseError);
  });

  it('throws VdfParseError when a key is missing closing quote', () => {
    expect(() => parseVdf('"unterminated "value"')).toThrow(VdfParseError);
  });

  it('throws VdfParseError when a value is missing closing quote', () => {
    expect(() => parseVdf('"key" unterminated')).toThrow(VdfParseError);
  });

  it('throws VdfParseError when a value opens a brace but the body is invalid', () => {
    expect(() => parseVdf('"key" { "sub"')).toThrow(VdfParseError);
  });

  it('throws VdfParseError when a value is not a string and not an object', () => {
    expect(() => parseVdf('"key" 42')).toThrow(VdfParseError);
  });

  it('strips ANSI escape sequences that SteamCMD interleaves with the VDF', () => {
    const raw = '\x1B[0m"380870"\x1B[0m\n\x1B[0m{\x1B[0m\n  "name"\x1B[0m "Project Zomboid"\x1B[0m\n}\x1B[0m\n';
    const parsed = parseVdf(raw);
    expect(parsed).toEqual({ name: 'Project Zomboid' });
  });

  it('parses a realistic SteamCMD app_info_print output with branches', () => {
    const raw = [
      '\x1B[0mAppID : 380870, change number : 37550343\x1B[0m',
      '\x1B[0m"380870"\x1B[0m',
      '\x1B[0m{\x1B[0m',
      '  "branches"',
      '  \x1B[0m{\x1B[0m',
      '    "public"',
      '    \x1B[0m{\x1B[0m',
      '      "buildid"   "22695654"',
      '      "timeupdated"   "1775656121"',
      '    \x1B[0m}\x1B[0m',
      '    "42.19"',
      '    \x1B[0m{\x1B[0m',
      '      "buildid"   "23504635"',
      '      "description"   "Build 42.19"',
      '      "timeupdated"   "1784821702"',
      '    \x1B[0m}\x1B[0m',
      '    "unstable"',
      '    \x1B[0m{\x1B[0m',
      '      "buildid"   "23504635"',
      '      "description"   "unstable"',
      '    \x1B[0m}\x1B[0m',
      '  \x1B[0m}\x1B[0m',
      '\x1B[0m}\x1B[0m'
    ].join('\n');
    const parsed = parseVdf(raw);
    const branches = parsed['branches'] as Record<string, Record<string, string>>;
    expect(branches).toBeDefined();
    expect(branches['public'].buildid).toBe('22695654');
    expect(branches['42.19'].description).toBe('Build 42.19');
    expect(branches['42.19'].buildid).toBe('23504635');
    expect(branches['unstable'].buildid).toBe('23504635');
  });

  it('strips CR, BEL and NULL characters that SteamCMD emits in some locales', () => {
    const raw = '\x07"key"\x07 "value"\r\n';
    const parsed = parseVdf(raw);
    expect(parsed).toEqual({ key: 'value' });
  });

  it('parses a real SteamCMD app_info_print dump with the full depots section and finds branches at the top level', () => {
    // Full reproduction of the actual SteamCMD output. The depots section
    // contains 7 depot entries (1004–380874) including 380871 which has
    // manifest keys that overlap with branch names (public, 42.19, etc.).
    // The parser must keep branches at the TOP level, not nested inside depots.
    const raw = [
      '\x1B[0mAppID : 380870, change number : 37550343/0, last change : Mon Jul 27 06:08:48 2026 \x1B[0m',
      '\x1B[0m"380870"\x1B[0m',
      '\x1B[0m{\x1B[0m',
      '\x1B[0m	"common"\x1B[0m',
      '\x1B[0m	{\x1B[0m',
      '\x1B[0m		"name"\x1B[0m \x1B[0m \x1B[0m"Project Zomboid Dedicated Server"\x1B[0m',
      '\x1B[0m	}\x1B[0m',
      '\x1B[0m	"config"\x1B[0m',
      '\x1B[0m	{\x1B[0m',
      '\x1B[0m		"contenttype"\x1B[0m \x1B[0m \x1B[0m"3"\x1B[0m',
      '\x1B[0m		"installdir"\x1B[0m \x1B[0m \x1B[0m"Project Zomboid Dedicated Server"\x1B[0m',
      '\x1B[0m		"launch"\x1B[0m',
      '\x1B[0m		{\x1B[0m',
      '\x1B[0m			"0"\x1B[0m \x1B[0m{\x1B[0m \x1B[0m				"executable"\x1B[0m \x1B[0m \x1B[0m"StartServer64.bat"\x1B[0m \x1B[0m			}\x1B[0m',
      '\x1B[0m			"1"\x1B[0m \x1B[0m{\x1B[0m \x1B[0m				"executable"\x1B[0m \x1B[0m \x1B[0m"StartServer32.bat"\x1B[0m \x1B[0m			}\x1B[0m',
      '\x1B[0m			"2"\x1B[0m \x1B[0m{\x1B[0m \x1B[0m				"executable"\x1B[0m \x1B[0m \x1B[0m"start-server.sh"\x1B[0m \x1B[0m			}\x1B[0m',
      '\x1B[0m		}\x1B[0m',
      '\x1B[0m	}\x1B[0m',
      '\x1B[0m	"depots"\x1B[0m',
      '\x1B[0m	{\x1B[0m',
      '\x1B[0m		"1004"\x1B[0m \x1B[0m{\x1B[0m \x1B[0m			"config"\x1B[0m \x1B[0m{\x1B[0m \x1B[0m				"oslist"\x1B[0m \x1B[0m \x1B[0m"windows"\x1B[0m \x1B[0m			}\x1B[0m \x1B[0m		}\x1B[0m',
      '\x1B[0m		"1005"\x1B[0m \x1B[0m{\x1B[0m \x1B[0m			"config"\x1B[0m \x1B[0m{\x1B[0m \x1B[0m				"oslist"\x1B[0m \x1B[0m \x1B[0m"macos"\x1B[0m \x1B[0m			}\x1B[0m \x1B[0m		}\x1B[0m',
      '\x1B[0m		"1006"\x1B[0m \x1B[0m{\x1B[0m \x1B[0m			"config"\x1B[0m \x1B[0m{\x1B[0m \x1B[0m				"oslist"\x1B[0m \x1B[0m \x1B[0m"linux"\x1B[0m \x1B[0m			}\x1B[0m \x1B[0m		}\x1B[0m',
      // Depot 380871: manifests with keys that overlap with branch names
      '\x1B[0m		"380871"\x1B[0m',
      '\x1B[0m		{\x1B[0m',
      '\x1B[0m			"manifests"\x1B[0m',
      '\x1B[0m			{\x1B[0m',
      '\x1B[0m				"public"\x1B[0m \x1B[0m{\x1B[0m \x1B[0m					"gid"\x1B[0m \x1B[0m \x1B[0m"5442401089660621010"\x1B[0m \x1B[0m					"size"\x1B[0m \x1B[0m \x1B[0m"5063750490"\x1B[0m \x1B[0m				}\x1B[0m',
      '\x1B[0m				"42.19"\x1B[0m \x1B[0m{\x1B[0m \x1B[0m					"gid"\x1B[0m \x1B[0m \x1B[0m"3241940016605667808"\x1B[0m \x1B[0m					"size"\x1B[0m \x1B[0m \x1B[0m"6746274612"\x1B[0m \x1B[0m				}\x1B[0m',
      '\x1B[0m				"legacy41"\x1B[0m \x1B[0m{\x1B[0m \x1B[0m					"gid"\x1B[0m \x1B[0m \x1B[0m"5442401089660621010"\x1B[0m \x1B[0m					"size"\x1B[0m \x1B[0m \x1B[0m"5063750490"\x1B[0m \x1B[0m				}\x1B[0m',
      '\x1B[0m				"outdatedunstable"\x1B[0m \x1B[0m{\x1B[0m \x1B[0m					"gid"\x1B[0m \x1B[0m \x1B[0m"5698619929827919870"\x1B[0m \x1B[0m					"size"\x1B[0m \x1B[0m \x1B[0m"6735691063"\x1B[0m \x1B[0m				}\x1B[0m',
      '\x1B[0m				"unstable"\x1B[0m \x1B[0m{\x1B[0m \x1B[0m					"gid"\x1B[0m \x1B[0m \x1B[0m"3241940016605667808"\x1B[0m \x1B[0m					"size"\x1B[0m \x1B[0m \x1B[0m"6746274612"\x1B[0m \x1B[0m				}\x1B[0m',
      '\x1B[0m			}\x1B[0m',
      '\x1B[0m		}\x1B[0m',
      '\x1B[0m		"380872"\x1B[0m \x1B[0m{\x1B[0m \x1B[0m			"config"\x1B[0m \x1B[0m{\x1B[0m \x1B[0m				"oslist"\x1B[0m \x1B[0m \x1B[0m"macos"\x1B[0m \x1B[0m			}\x1B[0m \x1B[0m		}\x1B[0m',
      '\x1B[0m		"380873"\x1B[0m \x1B[0m{\x1B[0m \x1B[0m			"config"\x1B[0m \x1B[0m{\x1B[0m \x1B[0m				"oslist"\x1B[0m \x1B[0m \x1B[0m"linux"\x1B[0m \x1B[0m			}\x1B[0m \x1B[0m		}\x1B[0m',
      '\x1B[0m		"380874"\x1B[0m \x1B[0m{\x1B[0m \x1B[0m			"config"\x1B[0m \x1B[0m{\x1B[0m \x1B[0m				"oslist"\x1B[0m \x1B[0m \x1B[0m"windows"\x1B[0m \x1B[0m			}\x1B[0m \x1B[0m		}\x1B[0m',
      '\x1B[0m	}\x1B[0m',
      '\x1B[0m	"branches"\x1B[0m',
      '\x1B[0m	{\x1B[0m',
      '\x1B[0m		"public"\x1B[0m \x1B[0m{\x1B[0m \x1B[0m			"buildid"\x1B[0m \x1B[0m \x1B[0m"22695654"\x1B[0m \x1B[0m			"timeupdated"\x1B[0m \x1B[0m \x1B[0m"1775656121"\x1B[0m \x1B[0m		}\x1B[0m',
      '\x1B[0m		"42.19"\x1B[0m \x1B[0m{\x1B[0m \x1B[0m			"buildid"\x1B[0m \x1B[0m \x1B[0m"23504635"\x1B[0m \x1B[0m			"description"\x1B[0m \x1B[0m \x1B[0m"Build 42.19"\x1B[0m \x1B[0m		}\x1B[0m',
      '\x1B[0m		"legacy41"\x1B[0m \x1B[0m{\x1B[0m \x1B[0m			"buildid"\x1B[0m \x1B[0m \x1B[0m"22695654"\x1B[0m \x1B[0m			"description"\x1B[0m \x1B[0m \x1B[0m"Build 41.78.19"\x1B[0m \x1B[0m		}\x1B[0m',
      '\x1B[0m		"outdatedunstable"\x1B[0m \x1B[0m{\x1B[0m \x1B[0m			"buildid"\x1B[0m \x1B[0m \x1B[0m"23177484"\x1B[0m \x1B[0m			"description"\x1B[0m \x1B[0m \x1B[0m" Unstable fallback branch"\x1B[0m \x1B[0m		}\x1B[0m',
      '\x1B[0m		"unstable"\x1B[0m \x1B[0m{\x1B[0m \x1B[0m			"buildid"\x1B[0m \x1B[0m \x1B[0m"23504635"\x1B[0m \x1B[0m			"description"\x1B[0m \x1B[0m \x1B[0m"unstable"\x1B[0m \x1B[0m		}\x1B[0m',
      '\x1B[0m	}\x1B[0m',
      '\x1B[0m	"privatebranches"\x1B[0m \x1B[0m \x1B[0m"1"\x1B[0m',
      '\x1B[0m}\x1B[0m',
      '\x1B[0mUnloading Steam API...OK\x1B[0m'
    ].join('\n');

    const parsed = parseVdf(raw);
    expect(Object.keys(parsed)).toEqual(expect.arrayContaining(['common', 'config', 'depots', 'branches', 'privatebranches']));
    const branches = parsed['branches'] as Record<string, Record<string, string>>;
    expect(branches).toBeDefined();
    expect(Object.keys(branches).length).toBeGreaterThanOrEqual(5);
    expect(branches['public'].buildid).toBe('22695654');
    expect(branches['42.19'].buildid).toBe('23504635');
    expect(branches['42.19'].description).toBe('Build 42.19');
    expect(branches['unstable'].buildid).toBe('23504635');
  });

  it('throws VdfParseError when an unterminated string is encountered as a value', () => {
    expect(() => parseVdf('"key')).toThrow(/sin cerrar/);
  });

  it('throws VdfParseError when the document is only whitespace and comments', () => {
    expect(() => parseVdf('   // nothing useful\n  ')).toThrow(VdfParseError);
  });

  it('handles tab characters in whitespace skipping', () => {
    const result = parseVdf('\t"key"\t"value"\t');
    expect(result).toEqual({ key: 'value' });
  });

  it('handles a key immediately followed by a nested object', () => {
    const result = parseVdf('"root"\n{\n  "child" { "a" "1" }\n}');
    expect(result).toEqual({ child: { a: '1' } });
  });

  it('handles escaped backslash and quote in quoted strings', () => {
    const result = parseVdf('"a" "path\\\\to\\\\file" "b" "say \\"hi\\""');
    expect(result).toEqual({ a: 'path\\to\\file', b: 'say "hi"' });
  });

  it('passes through non-special escape characters unchanged', () => {
    const result = parseVdf('"v" "\\x"');
    expect(result).toEqual({ v: 'x' });
  });
});
