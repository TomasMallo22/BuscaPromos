import { describe, expect, it } from 'vitest';
import { secretoValido, tokenDeStart } from './telegram';

describe('secretoValido — E11', () => {
  it('igual: valido', () => {
    expect(secretoValido('abc123', 'abc123')).toBe(true);
  });
  it.each([
    [null, 'abc123'],
    ['', 'abc123'],
    ['abc124', 'abc123'],
    ['abc1234', 'abc123'],
  ])('%s contra %s: invalido', (recibido, esperado) => {
    expect(secretoValido(recibido, esperado)).toBe(false);
  });
  it('sin secreto configurado, nada es valido (no "cualquiera entra")', () => {
    expect(secretoValido('', '')).toBe(false);
    expect(secretoValido('x', undefined)).toBe(false);
  });
});

describe('tokenDeStart', () => {
  const token = '0123456789abcdef0123456789abcdef';
  it('"/start <token>" del deep link', () => {
    expect(tokenDeStart(`/start ${token}`)).toBe(token);
  });
  it.each(['/start', '/start abc', `hola ${token}`, `/start ${token} extra`, undefined])('%s: nada', (texto) => {
    expect(tokenDeStart(texto)).toBeNull();
  });
});
