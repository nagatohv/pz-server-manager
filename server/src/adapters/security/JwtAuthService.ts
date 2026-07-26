import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import IAuthService from '../../domain/ports/IAuthService.js';
import { SERVER_STRINGS } from '../../config/strings.js';
import { SERVER_CONSTANTS } from '../../config/constants.js';
import type { AuthTokenPayload, ISystemConfig } from '../../types.js';

/**
 * Service implementing IAuthService.
 * Handles credential verification and JWT token generation/validation.
 */
export default class JwtAuthService implements IAuthService {
  private systemConfig: ISystemConfig;

  constructor(systemConfig: ISystemConfig) {
    this.systemConfig = systemConfig;
  }

  verifyPassword(plainPassword: string): boolean {
    const adminPassword = this.systemConfig.ADMIN_PASSWORD;
    if (adminPassword.startsWith('$2a$') || adminPassword.startsWith('$2b$')) {
      return bcrypt.compareSync(plainPassword, adminPassword);
    }
    return plainPassword === adminPassword;
  }

  generateToken(): string {
    return jwt.sign({ role: 'admin' }, this.systemConfig.JWT_SECRET, { expiresIn: SERVER_CONSTANTS.JWT_EXPIRY_SECONDS });
  }

  verifyToken(token: string): AuthTokenPayload {
    try {
      return jwt.verify(token, this.systemConfig.JWT_SECRET) as AuthTokenPayload;
    } catch (err) {
      throw new Error(SERVER_STRINGS.ERR_INVALID_OR_EXPIRED_TOKEN);
    }
  }
}
