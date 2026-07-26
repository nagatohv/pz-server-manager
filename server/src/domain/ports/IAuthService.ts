/**
 * Interface/Port for Authentication Service.
 * Defines the contract for verifying passwords and managing JWT tokens.
 */
import type { AuthTokenPayload } from '../../types.js';

export default interface IAuthService {
  verifyPassword(plainPassword: string): boolean;
  generateToken(): string;
  verifyToken(token: string): AuthTokenPayload;
}
