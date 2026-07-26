import { describe, it, expect } from 'vitest';
import systemConfig from '../config/system-config.js';
import { SERVER_CONSTANTS } from '../config/constants.js';
import { SERVER_STRINGS } from '../config/strings.js';

describe('Server System and Configuration Constants', () => {
  it('should initialize systemConfig with defaults or env overrides', () => {
    expect(systemConfig.PORT).toBeGreaterThan(0);
    expect(systemConfig.JWT_SECRET).toBeDefined();
    expect(systemConfig.ADMIN_PASSWORD).toBeDefined();
    expect(systemConfig.DATA_DIR).toBeDefined();
    expect(systemConfig.PZ_SERVER_DIR).toContain('pzserver');
    expect(systemConfig.ZO_USER_DIR).toContain('Zomboid');
    expect(systemConfig.JVM_MIN_GB).toBeGreaterThanOrEqual(1);
    expect(systemConfig.JVM_MAX_GB).toBeGreaterThanOrEqual(1);
  });

  it('should contain valid server constants and HTTP routes', () => {
    expect(SERVER_CONSTANTS.DEFAULT_PORT).toBe(3000);
    expect(SERVER_CONSTANTS.DEFAULT_HOST).toBe('0.0.0.0');
    expect(SERVER_CONSTANTS.ROUTES.LOGIN).toBe('/api/auth/login');
    expect(SERVER_CONSTANTS.HTTP_STATUS.OK).toBe(200);
  });

  it('should contain valid server strings', () => {
    expect(SERVER_STRINGS.ERR_PASSWORD_REQUIRED).toBeDefined();
    expect(SERVER_STRINGS.MSG_SERVER_ONLINE).toBeDefined();
  });
});
