import { CLIENT_STRINGS } from '../config/strings.js';

/** Mapa de reemplazos de texto en inglés → español para descripciones genéricas */
const FALLBACK_REPLACEMENTS: ReadonlyArray<readonly [RegExp, string]> = [
  [/Disables/gi, 'Desactiva'],
  [/Enables/gi, 'Habilita'],
  [/anti-cheat protection/gi, 'protección anti-cheat'],
  [/Default:/gi, 'Por defecto:'],
  [/Min:/gi, 'Mín:'],
  [/Max:/gi, 'Máx:']
] as const;

/**
 * Translates configuration descriptions from English to Spanish.
 * Returns Spanish descriptions from dictionary or performs regex fallback translations.
 *
 * @param key - The configuration key
 * @param englishDesc - The parsed English description (if any)
 * @returns Spanish translated description
 */
export const translateDescription = (key: string, englishDesc: string): string => {
  const dict = CLIENT_STRINGS.DICTIONARY as Record<string, string>;

  if (dict[key]) {
    return dict[key];
  }

  if (!englishDesc) return '';

  return FALLBACK_REPLACEMENTS.reduce(
    (desc, [pattern, replacement]) => desc.replace(pattern, replacement),
    englishDesc
  );
};
