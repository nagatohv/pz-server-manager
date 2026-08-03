import { AppError } from '../domain/AppError.js';
import type { ErrorCode } from '../config/errorCodes.js';

export const throwApiError = (
  code: ErrorCode,
  template: string,
  params?: Record<string, string | number>
): never => {
  const message = params
    ? Object.entries(params).reduce(
        (acc, [key, value]) => acc.replace(`{${key}}`, String(value)),
        template
      )
    : template;
  throw new AppError(code, message, params);
};
