/**
 * Minimal Valve Data Format (VDF) parser used to interpret the output of
 * `steamcmd +app_info_print <appId> +quit`. The format is a recursive set of
 * quoted keys whose values are either quoted strings, nested objects, or
 * sub-objects using the empty key syntax (`"Key" { "subkey" "value" }`).
 *
 * The parser accepts documents with an optional leading root key, with or
 * without a wrapping `{ }` block. SteamCMD prefixes the document with a
 * `Steam>` prompt and human-readable lines, which are skipped transparently.
 *
 * This parser is intentionally dependency-free to keep the backend lightweight
 * and to make the catalog adapter easy to unit-test in isolation.
 */

export type VdfValue = string | VdfObject;
export type VdfObject = { [key: string]: VdfValue };

/** Thrown when the VDF input cannot be parsed. */
export class VdfParseError extends Error {
  public position: number;
  constructor(message: string, position: number) {
    super(message);
    this.name = 'VdfParseError';
    this.position = position;
  }
}

const isWhitespace = (ch: string): boolean => ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r';

const skipWhitespaceAndComments = (input: string, index: number): number => {
  let i = index;
  while (i < input.length) {
    const ch = input[i];
    if (isWhitespace(ch)) {
      i += 1;
      continue;
    }
    if (ch === '/' && input[i + 1] === '/') {
      const newline = input.indexOf('\n', i);
      i = newline === -1 ? input.length : newline + 1;
      continue;
    }
    break;
  }
  return i;
};

const readQuotedString = (input: string, index: number): { value: string; next: number } => {
  if (input[index] !== '"') {
    throw new VdfParseError(`Se esperaba '"' en la posición ${index}`, index);
  }
  let i = index + 1;
  let out = '';
  while (i < input.length) {
    const ch = input[i];
    if (ch === '"') {
      return { value: out, next: i + 1 };
    }
    if (ch === '\\' && i + 1 < input.length) {
      const next = input[i + 1];
      if (next === 'n') out += '\n';
      else if (next === 't') out += '\t';
      else if (next === 'r') out += '\r';
      else if (next === '\\') out += '\\';
      else if (next === '"') out += '"';
      else out += next;
      i += 2;
      continue;
    }
    out += ch;
    i += 1;
  }
  throw new VdfParseError('Cadena VDF sin cerrar', index);
};

/**
 * Parses the body of a VDF object starting at the `{` character located at
 * `index`. The caller is responsible for ensuring `index` points to `{`.
 * Throws if the closing `}` is not found.
 */
const parseObjectBody = (input: string, index: number): { value: VdfObject; next: number } => {
  let i = skipWhitespaceAndComments(input, index);
  i = skipWhitespaceAndComments(input, i + 1);
  const result: VdfObject = {};

  while (i < input.length && input[i] !== '}') {
    const keyRead = readQuotedString(input, i);
    const key = keyRead.value;
    i = skipWhitespaceAndComments(input, keyRead.next);

    if (input[i] === '{') {
      const sub = parseObjectBody(input, i);
      result[key] = sub.value;
      i = sub.next;
    } else {
      const valueRead = readQuotedString(input, i);
      result[key] = valueRead.value;
      i = valueRead.next;
    }
    i = skipWhitespaceAndComments(input, i);
  }

  if (input[i] !== '}') {
    throw new VdfParseError(`Se esperaba '}' en la posición ${i}`, i);
  }
  return { value: result, next: i + 1 };
};

/**
 * Parses a flat list of key/value pairs at the top level. A pair may also
 * have a nested object as its value (e.g. `"380870" { ... }`).
 */
const parseFlatPairs = (input: string, index: number): { value: VdfObject; next: number } => {
  const result: VdfObject = {};
  let i = skipWhitespaceAndComments(input, index);

  while (i < input.length) {
    if (input[i] === '}') break;
    const keyRead = readQuotedString(input, i);
    i = skipWhitespaceAndComments(input, keyRead.next);

    if (input[i] === '{') {
      const sub = parseObjectBody(input, i);
      result[keyRead.value] = sub.value;
      i = sub.next;
    } else {
      const valueRead = readQuotedString(input, i);
      result[keyRead.value] = valueRead.value;
      i = valueRead.next;
    }
    i = skipWhitespaceAndComments(input, i);
  }

  return { value: result, next: i };
};

/**
 * Strips the noise that SteamCMD sprinkles throughout its output:
 *   - CSI sequences: `\x1B[...letter` (colors, cursor moves, etc.)
 *   - OSC sequences: `\x1B]...\x07` or `\x1B]...\x1B\\`
 *   - Two-char escape sequences: `\x1B<ch>`
 *   - Stray `\r`, `\x07` (bell) and `\x00` (NULL) characters
 *
 * Keeping these in the buffer confused the tokenizer because they contain
 * digits, semicolons and square brackets that are not valid VDF syntax.
 */
export const stripSteamAnsi = (input: string): string => {
  if (typeof input !== 'string' || input.length === 0) return input;
  return input
    // eslint-disable-next-line no-control-regex
    .replace(/\x1B\[[0-9;?]*[ -/]*[@-~]/g, '')
    // eslint-disable-next-line no-control-regex
    .replace(/\x1B\][^\x07\x1B]*(?:\x07|\x1B\\)/g, '')
    // eslint-disable-next-line no-control-regex
    .replace(/\x1B[@-Z\\-_]/g, '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00\x07]/g, '')
    // Replace bare CR that isn't part of a CRLF pair.
    .replace(/\r(?!\n)/g, '');
};

/**
 * Parses a VDF document. The parser transparently skips any preamble emitted
 * by SteamCMD (such as the `Steam>` prompt) and supports two shapes:
 *
 *  - Flat documents: `"key" "value" "key2" "value2"` → returned as-is.
 *  - Wrapped documents: `"root" { "key" "value" ... }` → the leading root
 *    key is unwrapped so callers receive the inner object directly.
 *  - Brace-rooted documents: `{ "key" "value" ... }` → returned as-is.
 *
 * ANSI escape codes (e.g. `[0m`, `[1;31m`) are stripped before parsing.
 */
export const parseVdf = (input: string): VdfObject => {
  if (typeof input !== 'string' || input.length === 0) {
    throw new VdfParseError('Entrada VDF vacía o inválida', 0);
  }

  const sanitized = stripSteamAnsi(input);

  let i = skipWhitespaceAndComments(sanitized, 0);

  while (i < sanitized.length && sanitized[i] !== '"' && sanitized[i] !== '{') {
    i += 1;
  }

  if (i >= sanitized.length) {
    throw new VdfParseError('No se encontró un objeto VDF válido', 0);
  }

  if (sanitized[i] === '{') {
    const obj = parseObjectBody(sanitized, i);
    return obj.value;
  }

  const firstKey = readQuotedString(sanitized, i);
  const peek = skipWhitespaceAndComments(sanitized, firstKey.next);

  if (sanitized[peek] === '{') {
    const inner = parseObjectBody(sanitized, peek);
    return inner.value;
  }

  const firstValue = readQuotedString(sanitized, peek);
  const result: VdfObject = { [firstKey.value]: firstValue.value };
  const rest = parseFlatPairs(sanitized, firstValue.next).value;
  return { ...result, ...rest };
};
