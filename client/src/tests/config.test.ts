import { describe, it, expect } from 'vitest';
import { CLIENT_CONSTANTS } from '../config/constants.js';
import i18n from '../i18n/index.js';

describe('Client Configuration Constants and i18n', () => {
  it('should contain valid client constants and i18n resources', () => {
    expect(CLIENT_CONSTANTS.API_AUTH_LOGIN).toBe('/api/auth/login');
    const dictionary = i18n.getResource(i18n.language, 'translation', 'dictionary') as Record<string, string>;
    expect(dictionary?.['MaxPlayers']).toBeDefined();
  });
});
