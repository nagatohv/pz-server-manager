import { beforeAll } from 'vitest';
import i18n from '../i18n/index.js';

beforeAll(async () => {
  await i18n.changeLanguage('es');
});
