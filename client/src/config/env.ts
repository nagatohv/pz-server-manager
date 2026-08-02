export const ENV = {
  API_BASE: import.meta.env.VITE_API_BASE || '',
  WS_URL: import.meta.env.VITE_WS_URL || '',
  APP_VERSION: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'
};
