import { describe, it, expect } from 'vitest';
import { translateDescription } from '../utils/translator.js';

describe('translateDescription', () => {
  it('should translate known keys using the dictionary', () => {
    const key = 'MaxPlayers';
    const translation = translateDescription(key, 'Max players that can connect');
    expect(translation).toBe('Cantidad máxima de jugadores permitidos simultáneamente en el servidor.');
  });

  it('should translate fallback terms using regex replacement', () => {
    const translation = translateDescription('SomeUnknownKey', 'Disables anti-cheat protection. Default: 4.');
    expect(translation).toBe('Desactiva protección anti-cheat. Por defecto: 4.');
  });

  it('should return empty string if no description exists', () => {
    const translation = translateDescription('SomeUnknownKey', '');
    expect(translation).toBe('');
  });
});
