import ConfigParserStrategy from './ConfigParserStrategy.js';
import type { IniSetting } from '../../types.js';

interface IniRawItem {
  type: 'comment' | 'setting';
  key?: string;
  value?: string;
  commentValue?: string;
  originalLine?: string;
}

/**
 * Concrete Strategy to parse and serialize Project Zomboid .ini config files.
 * Preserves comments and maps descriptions.
 */
export default class IniParserStrategy extends ConfigParserStrategy {
  /**
   * Parse ini raw text into structured settings array with descriptions.
   */
  parse(content: string): IniSetting[] {
    if (!content) return [];
    
    const lines = content.split(/\r?\n/);
    const rawStructure: IniRawItem[] = [];
    const settings: IniSetting[] = [];
    let currentComments: string[] = [];

    // Paso 1: Parsear a estructura cruda básica
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#') || trimmed.startsWith(';') || trimmed === '') {
        rawStructure.push({ type: 'comment', commentValue: line });
      } else if (trimmed.includes('=')) {
        const index = line.indexOf('=');
        const key = line.substring(0, index).trim();
        const value = line.substring(index + 1).trim();
        rawStructure.push({ type: 'setting', key, value, originalLine: line });
      } else {
        rawStructure.push({ type: 'comment', commentValue: line });
      }
    }

    // Paso 2: Asociar comentarios consecutivos como descripción
    for (const item of rawStructure) {
      if (item.type === 'comment') {
        const cleanComment = (item.commentValue || '').replace(/^[#;]\s*/, '').trim();
        if (cleanComment) {
          currentComments.push(cleanComment);
        }
      } else if (item.type === 'setting') {
        if (item.key && item.value !== undefined) {
          settings.push({
            key: item.key,
            value: item.value,
            description: currentComments.join(' ')
          });
        }
        currentComments = [];
      }
    }

    return settings;
  }

  /**
   * Serialize updated settings back to ini format, preserving structure and comments.
   */
  serialize(data: unknown, originalContent?: string): string {
    const settingsObj = (data || {}) as Record<string, string>;
    const lines = originalContent ? originalContent.split(/\r?\n/) : [];
    const outputLines: string[] = [];
    const keysToUpdate: Record<string, string> = { ...settingsObj };

    // Iterar sobre las líneas originales para conservar comentarios y actualizar valores
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#') || trimmed.startsWith(';') || trimmed === '') {
        outputLines.push(line);
      } else if (trimmed.includes('=')) {
        const index = line.indexOf('=');
        const key = line.substring(0, index).trim();
        const originalVal = line.substring(index + 1).trim();
        
        if (key in keysToUpdate) {
          outputLines.push(`${key}=${keysToUpdate[key]}`);
          delete keysToUpdate[key];
        } else {
          outputLines.push(`${key}=${originalVal}`);
        }
      } else {
        outputLines.push(line);
      }
    }

    // Añadir claves nuevas que no estaban en el original
    for (const [key, val] of Object.entries(keysToUpdate)) {
      outputLines.push(`${key}=${val}`);
    }

    return outputLines.join('\n');
  }
}
