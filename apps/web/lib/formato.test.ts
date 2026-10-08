import { describe, expect, it } from 'vitest';
import { coordenadasValidas, diaDeHistorial, pesos, porcentajeMenos, primeroPorProducto } from './formato';

describe('pesos — formato argentino', () => {
  it('punto para miles, coma para decimales', () => {
    expect(pesos(1200.5)).toBe('$1.200,50');
  });
  it('sin decimales si es entero', () => {
    expect(pesos(5500)).toBe('$5.500');
  });
});

describe('porcentajeMenos', () => {
  it('ratio 0.45 es 55% menos', () => {
    expect(porcentajeMenos(0.45)).toBe('55%');
  });
  it('redondea', () => {
    expect(porcentajeMenos(0.218)).toBe('78%');
  });
});

describe('coordenadasValidas', () => {
  it('el Obelisco si', () => {
    expect(coordenadasValidas(-34.60372, -58.38159)).toBe(true);
  });
  it.each([
    [NaN, -58],
    [0, 0],
    [40.7, -74], // Nueva York
    [-34.6, 58.4], // signo cambiado
  ])('%s, %s no', (lat, lng) => {
    expect(coordenadasValidas(lat, lng)).toBe(false);
  });
});

describe('diaDeHistorial', () => {
  const ahora = Date.parse('2026-10-10T12:00:00Z');
  it('la misma tarde de la primera corrida es el dia 1', () => {
    expect(diaDeHistorial('2026-10-10T09:00:00Z', ahora)).toBe(1);
  });
  it('dos dias despues es el dia 3', () => {
    expect(diaDeHistorial('2026-10-08T13:00:00Z', ahora)).toBe(3);
  });
});

describe('primeroPorProducto — un producto avisa una vez', () => {
  it('se queda con la primera aparicion de cada producto', () => {
    const xs = [
      { productoId: 'a', ratio: 0.2 },
      { productoId: 'b', ratio: 0.3 },
      { productoId: 'a', ratio: 0.4 },
    ];
    expect(primeroPorProducto(xs)).toEqual([xs[0], xs[1]]);
  });
});
