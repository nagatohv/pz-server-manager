import type { ErrorCode } from '../config/errorCodes.js';

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly params?: Record<string, string | number>;

  constructor(code: ErrorCode, message: string, params?: Record<string, string | number>) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.params = params;
  }
}
