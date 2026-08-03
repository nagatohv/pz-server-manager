import i18n from '../i18n/index.js';

export const translate = (key: string, options?: Record<string, unknown>): string =>
  i18n.t(key, options) as string;

export default i18n;
