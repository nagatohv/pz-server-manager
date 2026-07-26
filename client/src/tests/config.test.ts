import { describe, it, expect } from 'vitest';
import { CLIENT_CONSTANTS } from '../config/constants.js';
import { CLIENT_STRINGS } from '../config/strings.js';

describe('Client Configuration Constants and Strings', () => {
  it('should contain valid client constants and strings', () => {
    expect(CLIENT_CONSTANTS.API_AUTH_LOGIN).toBe('/api/auth/login');
    expect(CLIENT_STRINGS.TITLE).toBe('PZ Server Manager');
    expect(CLIENT_STRINGS.DICTIONARY['MaxPlayers']).toBeDefined();
  });
});
