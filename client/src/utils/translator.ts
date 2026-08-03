import { translate } from './i18n.js';

const FALLBACK_REPLACEMENTS: ReadonlyArray<readonly [RegExp, string]> = [
  [/Disables/gi, 'Desactiva'],
  [/Enables/gi, 'Habilita'],
  [/anti-cheat protection/gi, 'protección anti-cheat'],
  [/Default:/gi, 'Por defecto:'],
  [/Min:/gi, 'Mín:'],
  [/Max:/gi, 'Máx:']
] as const;

export const translateDescription = (key: string, englishDesc: string): string => {
  const translated = translate(`dictionary.${key}`);
  if (translated && translated !== `dictionary.${key}`) {
    return translated;
  }

  if (!englishDesc) return '';

  return FALLBACK_REPLACEMENTS.reduce(
    (desc, [pattern, replacement]) => desc.replace(pattern, replacement),
    englishDesc
  );
};
