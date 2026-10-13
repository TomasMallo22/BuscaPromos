import { describe, expect, it } from 'vitest';
import { medianaOtrasTiendas } from './mediana.js';

describe('medianaOtrasTiendas', () => {
  it('impar: el del medio', () => {
    expect(medianaOtrasTiendas([3400, 3859, 2699])).toEqual({ precio: 3400, nTiendas: 3 });
  });

  it('par: el promedio de los dos del medio', () => {
    expect(medianaOtrasTiendas([2000, 3000, 4000, 9000])).toEqual({ precio: 3500, nTiendas: 4 });
  });

  // E5 de la spec 002: con una sola referencia, un error de precio en la otra tienda seria un
  // falso positivo convincente.
  it('con menos de 2 tiendas no opina', () => {
    expect(medianaOtrasTiendas([2500])).toBeNull();
    expect(medianaOtrasTiendas([])).toBeNull();
  });

  it('ignora precios no positivos', () => {
    expect(medianaOtrasTiendas([0, 2500, 3000])).toEqual({ precio: 2750, nTiendas: 2 });
  });
});
