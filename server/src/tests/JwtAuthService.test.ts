import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';
import JwtAuthService from '../adapters/security/JwtAuthService.js';
import type { ISystemConfig } from '../types.js';

const createMockSystemConfig = (overrides: Partial<ISystemConfig> = {}): ISystemConfig => ({
  PORT: 3000,
  JWT_SECRET: 'test-jwt-secret-key-123',
  ADMIN_PASSWORD: 'test-admin-password',
  DATA_DIR: '/tmp/data',
  PZ_SERVER_DIR: '/tmp/data/pzserver',
  ZO_USER_DIR: '/tmp/data/Zomboid',
  SERVER_NAME: 'testserver',
  STEAM_APP_BRANCH: '',
  JVM_MIN_GB: 4,
  JVM_MAX_GB: 8,
  ...overrides
});

describe('JwtAuthService', () => {
  it('should verify plain password correctly', () => {
    const authService = new JwtAuthService(createMockSystemConfig());
    expect(authService.verifyPassword('test-admin-password')).toBe(true);
    expect(authService.verifyPassword('wrong-password')).toBe(false);
  });

  it('should verify bcrypt hashed password correctly', () => {
    const hashed = bcrypt.hashSync('secure-pass', 8);
    const authService = new JwtAuthService(createMockSystemConfig({ ADMIN_PASSWORD: hashed }));
    expect(authService.verifyPassword('secure-pass')).toBe(true);
    expect(authService.verifyPassword('wrong-pass')).toBe(false);
  });

  it('should generate and verify JWT token successfully', () => {
    const authService = new JwtAuthService(createMockSystemConfig());
    const token = authService.generateToken();
    expect(token).toBeDefined();

    const decoded = authService.verifyToken(token);
    expect(decoded.role).toBe('admin');
  });

  it('should throw error on invalid token verification', () => {
    const authService = new JwtAuthService(createMockSystemConfig());
    expect(() => authService.verifyToken('invalid.token.here')).toThrow();
  });
});
