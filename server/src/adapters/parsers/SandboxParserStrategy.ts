import ConfigParserStrategy from './ConfigParserStrategy.js';
import type { SandboxParsedResult } from '../../types.js';

/**
 * Concrete Strategy to parse and serialize Project Zomboid SandboxVars.lua config files.
 */
export default class SandboxParserStrategy extends ConfigParserStrategy {
  /**
   * Parse SandboxVars Lua table into a structured JS object containing values, descriptions, and option lists.
   */
  parse(content: string): SandboxParsedResult {
    const values: Record<string, unknown> = {};
    const descriptions: Record<string, string> = {};
    const options: Record<string, Array<{ value: number; label: string }>> = {};
    if (!content) return { values, descriptions, options };

    const lines = content.split(/\r?\n/);
    let currentGroup: Record<string, unknown> = values;
    const groupStack: Record<string, unknown>[] = [];
    let currentGroupPath = '';
    const pathStack: string[] = [];
    let pendingComments: string[] = [];

    const processPendingComments = (fullPath: string): void => {
      if (pendingComments.length === 0) return;
      
      const extractedOpts: Array<{ value: number; label: string }> = [];
      const cleanDescriptionLines: string[] = [];
      
      for (const commentLine of pendingComments) {
        const optionMatch = commentLine.match(/^(\d+)\s*[=-]\s*(.*)$/);
        if (optionMatch) {
          extractedOpts.push({
            value: Number(optionMatch[1]),
            label: `${optionMatch[1]} - ${optionMatch[2].trim()}`
          });
        } else {
          cleanDescriptionLines.push(commentLine);
        }
      }
      
      if (cleanDescriptionLines.length > 0) {
        descriptions[fullPath] = cleanDescriptionLines.join(' ');
      }
      if (extractedOpts.length > 0) {
        options[fullPath] = extractedOpts;
      }
      pendingComments = [];
    };

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      // Detectar comentarios
      if (trimmed.startsWith('--')) {
        const commentText = trimmed.replace(/^--\s*/, '').trim();
        if (commentText) {
          pendingComments.push(commentText);
        }
        continue;
      }
      
      // Comentarios en la misma línea
      let cleanLine = trimmed;
      const commentIndex = cleanLine.indexOf('--');
      if (commentIndex !== -1) {
        const inlineComment = cleanLine.substring(commentIndex).replace(/^--\s*/, '').trim();
        if (inlineComment) {
          pendingComments.push(inlineComment);
        }
        cleanLine = cleanLine.substring(0, commentIndex).trim();
      }
      
      // Fin de grupo }
      if (cleanLine === '}' || cleanLine === '},') {
        if (groupStack.length > 0) {
          currentGroup = groupStack.pop()!;
          currentGroupPath = pathStack.pop() || '';
        }
        pendingComments = [];
        continue;
      }
      
      // Inicio de grupo
      const groupMatch = cleanLine.match(/^([a-zA-Z0-9_]+)\s*=\s*\{$/);
      if (groupMatch) {
        const groupName = groupMatch[1];
        if (groupName !== 'SandboxVars') {
          currentGroup[groupName] = {};
          const fullPath = currentGroupPath ? `${currentGroupPath}.${groupName}` : groupName;
          processPendingComments(fullPath);
          
          groupStack.push(currentGroup);
          pathStack.push(currentGroupPath);
          
          currentGroup = currentGroup[groupName] as Record<string, unknown>;
          currentGroupPath = fullPath;
        }
        continue;
      }
      
      // Asignación simple
      const assignMatch = cleanLine.match(/^([a-zA-Z0-9_]+)\s*=\s*(.*?),?$/);
      if (assignMatch) {
        const key = assignMatch[1];
        let rawVal = assignMatch[2].trim();
        if (rawVal.endsWith(',')) rawVal = rawVal.slice(0, -1).trim();
        
        let val: unknown = rawVal;
        if (rawVal === 'true') val = true;
        else if (rawVal === 'false') val = false;
        else if (!isNaN(Number(rawVal))) val = Number(rawVal);
        else if ((rawVal.startsWith('"') && rawVal.endsWith('"')) || (rawVal.startsWith("'") && rawVal.endsWith("'"))) {
          val = rawVal.slice(1, -1);
        }
        
        currentGroup[key] = val;
        const fullPath = currentGroupPath ? `${currentGroupPath}.${key}` : key;
        processPendingComments(fullPath);
      }
    }

    return { values, descriptions, options };
  }

  /**
   * Serialize values object back into SandboxVars Lua format.
   */
  serialize(data: unknown): string {
    const dataObj = data as Record<string, unknown> | null;
    const valuesObj = dataObj && 'values' in dataObj ? (dataObj.values as Record<string, unknown>) : (dataObj || {});
    let lua = "SandboxVars = {\n";
    
    const serializeGroup = (group: Record<string, unknown>, indent: string): string => {
      let content = "";
      for (const [key, val] of Object.entries(group)) {
        if (val !== null && typeof val === 'object') {
          content += `${indent}${key} = {\n`;
          content += serializeGroup(val as Record<string, unknown>, indent + "    ");
          content += `${indent}},\n`;
        } else {
          let formattedVal: unknown = val;
          if (typeof val === 'string') {
            formattedVal = `"${val}"`;
          } else if (typeof val === 'boolean') {
            formattedVal = val ? 'true' : 'false';
          }
          content += `${indent}${key} = ${formattedVal},\n`;
        }
      }
      return content;
    };

    lua += serializeGroup(valuesObj as Record<string, unknown>, "    ");
    lua += "}\n";
    return lua;
  }
}
