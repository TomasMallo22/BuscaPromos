/**
 * Port de `unit_qty` de turbo/detect.py. Solo peso y volumen: las "Und" se descartan A
 * PROPOSITO (un paquete de 150 servilletas y una pizza son los dos "1 Und"). No agregues
 * unidades al diccionario.
 */
import { describe, expect, it } from 'vitest';
import { parsearPresentacion } from './presentacion.js';

describe('parsearPresentacion', () => {
  it.each([
    ['1 X 473 mL', { dimension: 'ml', cantidad: 473 }],
    ['3 X 324 g', { dimension: 'g', cantidad: 972 }],
    ['1 x 630 mL', { dimension: 'ml', cantidad: 630 }],
    ['1 X 1 kg', { dimension: 'g', cantidad: 1000 }],
    ['500 gr', { dimension: 'g', cantidad: 500 }],
    ['2 X 1,5 L', { dimension: 'ml', cantidad: 3000 }],
    ['1.5 lt', { dimension: 'ml', cantidad: 1500 }],
    ['354 cc', { dimension: 'ml', cantidad: 354 }],
    ['  6x200ml  ', { dimension: 'ml', cantidad: 1200 }],
  ] as const)('%s', (texto, esperado) => {
    expect(parsearPresentacion(texto)).toEqual(esperado);
  });

  it.each(['1 Und', '2 Und', '150 und', '1 X 1 Und'])('descarta las unidades: %s', (texto) => {
    expect(parsearPresentacion(texto)).toBeNull();
  });

  it.each(['', '   ', 'kg', '1 X kg', 'Pack familiar', '1 X 500 g extra', '1 kg y 500 g'])(
    'no matchea: %j',
    (texto) => {
      expect(parsearPresentacion(texto)).toBeNull();
    },
  );

  it('una "unidad" que es una propiedad heredada de Object no rompe ni matchea', () => {
    // Hazard del port: en JS, `{}['constructor']` existe. En el dict de Python, no.
    expect(parsearPresentacion('1 X 5 constructor')).toBeNull();
    expect(parsearPresentacion('2 toString')).toBeNull();
    expect(parsearPresentacion('3 __proto__')).toBeNull();
  });

  it('null y undefined no matchean', () => {
    expect(parsearPresentacion(null)).toBeNull();
    expect(parsearPresentacion(undefined)).toBeNull();
  });

  it('una cantidad cero no es una presentacion', () => {
    expect(parsearPresentacion('0 g')).toBeNull();
    expect(parsearPresentacion('0 X 500 g')).toBeNull();
  });
});
