import i18n, { type InitOptions } from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import esTranslations from './locales/es.json';
import enTranslations from './locales/en.json';

const initOptions: InitOptions = {
  resources: {
    es: { translation: esTranslations },
    en: { translation: enTranslations }
  },
  fallbackLng: 'es',
  interpolation: {
    prefix: '{',
    suffix: '}',
    escapeValue: false
  },
  detection: {
    order: ['localStorage', 'navigator'],
    caches: ['localStorage']
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init(initOptions);

export default i18n;
