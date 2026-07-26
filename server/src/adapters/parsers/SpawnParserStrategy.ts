import ConfigParserStrategy from './ConfigParserStrategy.js';
import type { SpawnRegion } from '../../types.js';

/**
 * Concrete Strategy to parse and serialize Project Zomboid spawnregions.lua config files.
 */
export default class SpawnParserStrategy extends ConfigParserStrategy {
  /**
   * Parse spawn regions Lua content into a structured JS array.
   */
  parse(content: string): SpawnRegion[] {
    const result: SpawnRegion[] = [];
    if (!content) return result;

    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const cleanLine = line.trim();
      const match = cleanLine.match(/(?:--)?\s*\{\s*name\s*=\s*"([^"]+)"\s*(?:,\s*(file|serverfile)\s*=\s*"([^"]+)")?\s*\}/);
      if (match) {
        const name = match[1];
        const type = match[2] as 'file' | 'serverfile' | undefined;
        const filePath = match[3];
        const isCommented = cleanLine.startsWith('--');
        
        const region: SpawnRegion = { name, isCommented };
        if (type && filePath) {
          region[type] = filePath;
        }
        result.push(region);
      }
    }
    return result;
  }

  /**
   * Serialize spawn regions array back into SpawnRegions() Lua code.
   */
  serialize(data: unknown): string {
    const regions = (data || []) as SpawnRegion[];
    let lua = "function SpawnRegions()\n\treturn {\n";
    
    for (const r of regions) {
      let line = `\t\t{ name = "${r.name}"`;
      if (r.file) {
        line += `, file = "${r.file}"`;
      } else if (r.serverfile) {
        line += `, serverfile = "${r.serverfile}"`;
      }
      line += " },";
      
      if (r.isCommented) {
        lua += `\t\t--${line.trim()}\n`;
      } else {
        lua += `${line}\n`;
      }
    }
    
    lua += "\t}\nend\n";
    return lua;
  }
}
