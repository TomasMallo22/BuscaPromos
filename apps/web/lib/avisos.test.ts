import { describe, expect, it } from 'vitest';
import { categoriasValidas, parsearTerminos } from './avisos';

describe('parsearTerminos', () => {
  it('uno por linea o separados por coma', () => {
    expect(parsearTerminos('aceite de oliva\nyogurt natural, yerba')).toEqual(['aceite de oliva', 'yogurt natural', 'yerba']);
  });
  it('limpia espacios, descarta vacios y muy cortos, y no repite', () => {
    expect(parsearTerminos('  Yerba  \n\n a \nyerba\n')).toEqual(['Yerba']);
  });
  it('corta los larguisimos y se queda con 30 como maximo', () => {
    expect(parsearTerminos('x'.repeat(100))).toEqual(['x'.repeat(40)]);
    expect(parsearTerminos(Array.from({ length: 40 }, (_, i) => `producto ${i}`).join('\n'))).toHaveLength(30);
  });
});

describe('categoriasValidas', () => {
  it('solo claves que existen, sin repetir: lo que llega del form lo escribio cualquiera', () => {
    expect(categoriasValidas(['lacteos', 'inventada', 'lacteos', 'almacen'])).toEqual(['lacteos', 'almacen']);
  });
});
