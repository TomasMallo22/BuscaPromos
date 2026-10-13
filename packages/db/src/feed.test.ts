import { describe, expect, it } from 'vitest';
import { patronIlike } from './feed.js';

const barra = '\\';

describe('patronIlike', () => {
  it('busca el texto en cualquier parte', () => {
    expect(patronIlike('yogur')).toBe('%yogur%');
  });
  it('un % o un _ del usuario no son comodines', () => {
    expect(patronIlike('50%_off')).toBe(`%50${barra}%${barra}_off%`);
  });
  it('una barra invertida tampoco escapa lo que sigue', () => {
    expect(patronIlike(`a${barra}b`)).toBe(`%a${barra}${barra}b%`);
  });
});
