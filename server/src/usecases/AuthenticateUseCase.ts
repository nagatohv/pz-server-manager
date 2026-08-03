import IAuthService from '../domain/ports/IAuthService.js';
import { AppError } from '../domain/AppError.js';
import { ERROR_CODES } from '../config/errorCodes.js';
import { SERVER_STRINGS } from '../config/strings.js';
import type { AuthTokenPayload } from '../types.js';

/**
 * Use case to orchestrate user authentication and session verification.
 */
export default class AuthenticateUseCase {
  private authService: IAuthService;

  constructor(authService: IAuthService) {
    this.authService = authService;
  }

  /**
   * Authenticate player with plain password and return session token.
   */
  execute(password: string): { token: string } {
    if (!password) {
      throw new AppError(ERROR_CODES.ERR_PASSWORD_REQUIRED, SERVER_STRINGS.ERR_PASSWORD_REQUIRED);
    }

    if (this.authService.verifyPassword(password)) {
      const token = this.authService.generateToken();
      return { token };
    }

    throw new AppError(ERROR_CODES.ERR_INCORRECT_PASSWORD, SERVER_STRINGS.ERR_INCORRECT_PASSWORD);
  }

  /**
   * Verify token payload validity.
   */
  verify(token: string): AuthTokenPayload {
    return this.authService.verifyToken(token);
  }
}
