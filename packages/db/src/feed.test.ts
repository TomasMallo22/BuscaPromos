import { describe, expect, it } from 'vitest';
import { filtroIntereses, patronIlike } from './feed.js';

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

describe('filtroIntereses — el `or` de PostgREST sobre productos (spec 005)', () => {
  it('categorias y terminos', () => {
    expect(filtroIntereses({ categorias: ['lacteos', 'almacen'], terminos: ['aceite de oliva', 'yerba'] })).toBe(
      'categoria.in.(lacteos,almacen),and(nombre.ilike.*_c__t*,nombre.ilike.*de*,nombre.ilike.*_l_v*),nombre.ilike.*y_rb*',
    );
  });
  it('E7: las vocales son cualquier letra, asi "azucar" encuentra "Azúcar" (despues se refina en TS)', () => {
    expect(filtroIntereses({ categorias: [], terminos: ['Azúcar'] })).toBe('nombre.ilike.*_z_c_*');
  });
  it('las palabras de 1 o 2 letras van tal cual: con comodines matchearian casi todo', () => {
    expect(filtroIntereses({ categorias: [], terminos: ['te'] })).toBe('nombre.ilike.*te*');
  });
  it('lo que no es letra ni numero no llega al filtro (comas, parentesis, comillas, comodines)', () => {
    expect(filtroIntereses({ categorias: [], terminos: ['te (verde), "x"*'] })).toBe('and(nombre.ilike.*te*,nombre.ilike.*v_rd*,nombre.ilike.*x*)');
  });
  it('sin intereses: null', () => {
    expect(filtroIntereses({ categorias: [], terminos: [] })).toBeNull();
    expect(filtroIntereses({ categorias: [], terminos: ['!!!'] })).toBeNull();
  });
});
