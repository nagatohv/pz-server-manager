import i18n from '../i18n/index.js';

export interface ApiErrorPayload {
  code?: string;
  error?: string;
  message?: string;
}

export const resolveApiError = (payload: ApiErrorPayload | undefined): string => {
  if (!payload) {
    return i18n.t('common.unknownError') as string;
  }

  if (payload.code) {
    const key = `errors.${payload.code}`;
    const translated = i18n.t(key);
    if (translated && translated !== key) {
      return translated as string;
    }
  }

  return (payload.error ?? payload.message ?? i18n.t('common.unknownError')) as string;
};
