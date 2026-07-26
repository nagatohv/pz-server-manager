import { describe, it, expect, vi } from 'vitest';
import AuthenticateUseCase from '../usecases/AuthenticateUseCase.js';
import type IAuthService from '../domain/ports/IAuthService.js';

describe('AuthenticateUseCase', () => {
  it('should authenticate user with valid password and return token', () => {
    const mockAuthService: IAuthService = {
      verifyPassword: vi.fn((pwd: string) => pwd === 'secret'),
      generateToken: vi.fn(() => 'mock-token'),
      verifyToken: vi.fn().mockReturnValue({ role: 'admin' })
    };

    const useCase = new AuthenticateUseCase(mockAuthService);
    const result = useCase.execute('secret');

    expect(mockAuthService.verifyPassword).toHaveBeenCalledWith('secret');
    expect(mockAuthService.generateToken).toHaveBeenCalled();
    expect(result).toEqual({ token: 'mock-token' });
  });

  it('should throw error for incorrect password', () => {
    const mockAuthService: IAuthService = {
      verifyPassword: vi.fn((pwd: string) => pwd === 'secret'),
      generateToken: vi.fn(() => ''),
      verifyToken: vi.fn().mockReturnValue({ role: 'admin' })
    };

    const useCase = new AuthenticateUseCase(mockAuthService);
    expect(() => useCase.execute('wrong-password')).toThrow('Contraseña incorrecta');
  });

  it('should throw error for empty password', () => {
    const mockAuthService: IAuthService = {
      verifyPassword: vi.fn(() => true),
      generateToken: vi.fn(() => ''),
      verifyToken: vi.fn().mockReturnValue({ role: 'admin' })
    };

    const useCase = new AuthenticateUseCase(mockAuthService);
    expect(() => useCase.execute('')).toThrow('Contraseña requerida');
  });
});
