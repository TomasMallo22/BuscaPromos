/**
 * Port de `offer_status` de turbo/detect.py. Ver docs/03-motor-deteccion.md seccion 2.
 *
 * El caso que no puede fallar: $700 x 25 dias -> $1400 x 3 dias -> $700 hoy => `inflado`.
 * Si da `real`, el precio habitual no pondera por duracion y todo el proyecto miente.
 *
 * Todos los valores esperados escritos a mano se contrastaron contra el Python original.
 */
import { describe, expect, it } from 'vitest';
import { AHORA, DIA, aFilas, cargarCaso, fila, type FilaCaso } from './casos.test-util.js';
import { estadoOferta } from './estado-oferta.js';
import type { EstadoOferta } from '../tipos.js';

interface CasoSerie {
  filas: FilaCaso[];
  esperado: { estadoOferta: EstadoOferta; precioReferencia: number | null; desdeDiasAtras: number };
}

const diasAtras = (ts: number) => (AHORA - ts) / DIA;

describe('estadoOferta — casos validados contra el original', () => {
  it.each([
    'inflado-sube-y-baja',
    'real-caida-sostenida',
    'sin-historial-corto',
    'oferta-permanente',
    'reajustes-dos-por-ciento',
  ])('%s', (nombre) => {
    const { filas, esperado } = cargarCaso<CasoSerie>(nombre);
    const r = estadoOferta(aFilas(filas), AHORA)!;
    expect(r.estado).toBe(esperado.estadoOferta);
    expect(r.precioReferencia).toBe(esperado.precioReferencia);
    expect(diasAtras(r.desde)).toBe(esperado.desdeDiasAtras);
  });
});

describe('estadoOferta — la referencia se evalua al momento del cambio, no en `ahora`', () => {
  it('con la ventana en `desde` la referencia es 1000 y la baja es real', () => {
    // Ventana en `desde` (hace 6 dias): 1000 sostuvo 8 dias, 800 sostuvo 6 -> ref 1000.
    // Ventana en `ahora`: 1000 sostuvo 2 dias, 800 sostuvo 6 -> ref 800, y daria `inflado`.
    const r = estadoOferta([fila(40, 1000), fila(12, 800), fila(6, 690)], AHORA)!;
    expect(r).toEqual({ estado: 'real', precioReferencia: 1000, desde: AHORA - 6 * DIA });
  });
});

describe('estadoOferta — el colapso de reajustes de +-2%', () => {
  it('exactamente 2% colapsa: el reloj no se reinicia', () => {
    const r = estadoOferta([fila(30, 1020), fila(3, 1000)], AHORA)!;
    expect(r).toEqual({ estado: 'inflado', precioReferencia: null, desde: AHORA - 30 * DIA });
  });

  it('2,1% no colapsa', () => {
    const r = estadoOferta([fila(30, 1021), fila(3, 1000)], AHORA)!;
    expect(r).toEqual({ estado: 'inflado', precioReferencia: 1021, desde: AHORA - 3 * DIA });
  });
});

describe('estadoOferta — los bordes de los umbrales', () => {
  it('exactamente oferta_permanente_dias (7) ya es `inflado`', () => {
    const r = estadoOferta([fila(40, 1000), fila(7, 600)], AHORA)!;
    expect(r).toEqual({ estado: 'inflado', precioReferencia: null, desde: AHORA - 7 * DIA });
  });

  it('exactamente un 15% abajo de la referencia es `real`', () => {
    expect(estadoOferta([fila(30, 1000), fila(1, 850)], AHORA)!.estado).toBe('real');
  });

  it('un 14,9% abajo es `inflado`', () => {
    const r = estadoOferta([fila(30, 1000), fila(1, 851)], AHORA)!;
    expect(r).toEqual({ estado: 'inflado', precioReferencia: 1000, desde: AHORA - DIA });
  });

  it('exactamente oferta_min_historial_dias (7) de historial previo alcanza para opinar', () => {
    const r = estadoOferta([fila(8, 500), fila(1, 300)], AHORA)!;
    expect(r).toEqual({ estado: 'real', precioReferencia: 500, desde: AHORA - DIA });
  });

  it('6,5 dias de historial previo no alcanzan', () => {
    const r = estadoOferta([fila(7.5, 500), fila(1, 300)], AHORA)!;
    expect(r).toEqual({ estado: 'sin_historial', precioReferencia: null, desde: AHORA - DIA });
  });
});

describe('estadoOferta — bordes', () => {
  it('historial vacio: null, no hay nada que clasificar', () => {
    expect(estadoOferta([], AHORA)).toBeNull();
  });

  it('una sola fila reciente: `sin_historial`', () => {
    expect(estadoOferta([fila(3, 700)], AHORA)!.estado).toBe('sin_historial');
  });

  it('una sola fila de hace 10 dias: `inflado`', () => {
    expect(estadoOferta([fila(10, 700)], AHORA)!.estado).toBe('inflado');
  });

  it('si el historial previo estuvo todo sin stock no hay referencia: `sin_historial`', () => {
    const r = estadoOferta([fila(30, 700, { enStock: false }), fila(1, 400)], AHORA)!;
    expect(r).toEqual({ estado: 'sin_historial', precioReferencia: null, desde: AHORA - DIA });
  });

  it('un tramo de promo excluida no cuenta como referencia', () => {
    const r = estadoOferta([fila(30, 700), fila(10, 100, { promoExcluida: true }), fila(1, 400)], AHORA)!;
    expect(r).toEqual({ estado: 'real', precioReferencia: 700, desde: AHORA - DIA });
  });

  it('precio actual 0: no divide por cero en el colapso', () => {
    const r = estadoOferta([fila(30, 700), fila(1, 0)], AHORA)!;
    expect(r).toEqual({ estado: 'real', precioReferencia: 700, desde: AHORA - DIA });
  });
});
