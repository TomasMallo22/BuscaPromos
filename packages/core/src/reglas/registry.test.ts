/**
 * El registry es la unica definicion de una regla (ADR 0007, regla de oro 10). Estos tests
 * fijan los defaults de docs/03-motor-deteccion.md seccion 6, que son los del original
 * (`DEFAULT_RULES` de turbo/detect.py, commit 431cb3f). Cambiar un umbral tiene que romper
 * un test: un umbral mas laxo cuesta falsos positivos, y eso no puede pasar en silencio.
 */
import { describe, expect, it } from 'vitest';
import { CLAVES_REGLA, PARAMETROS, REGISTRY } from './registry.js';

describe('REGISTRY', () => {
  it('tiene exactamente las 7 claves del enum regla_clave', () => {
    expect([...CLAVES_REGLA].sort()).toEqual(
      [
        'precio_absurdo',
        'caida_vs_historial',
        'descuento_extremo',
        'gran_descuento',
        'vs_otras_tiendas',
        'nuevo_vs_pasillo',
        'promo_usuario_nuevo',
      ].sort(),
    );
  });

  it('cada definicion repite su propia clave', () => {
    for (const clave of CLAVES_REGLA) expect(REGISTRY[clave].clave).toBe(clave);
  });

  it('los umbrales default son los del original', () => {
    expect(REGISTRY.precio_absurdo.umbral).toBe(10);
    expect(REGISTRY.caida_vs_historial.umbral).toBe(0.5);
    expect(REGISTRY.descuento_extremo.umbral).toBe(0.2);
    expect(REGISTRY.gran_descuento.umbral).toBe(0.5);
    expect(REGISTRY.vs_otras_tiendas.umbral).toBe(0.5);
    expect(REGISTRY.nuevo_vs_pasillo.umbral).toBe(0.2);
  });

  it('promo_usuario_nuevo no tiene umbral propio: usa el de descuento_extremo', () => {
    // En el original se evalua con rules["descuento_extremo"]. Escribir 0.2 dos veces seria
    // tener el mismo umbral en dos lugares (regla de oro 10).
    expect(REGISTRY.promo_usuario_nuevo.umbral).toBeNull();
  });

  it('el orden de prioridad es unico por regla', () => {
    const ordenes = CLAVES_REGLA.map((c) => REGISTRY[c].orden);
    expect(new Set(ordenes).size).toBe(ordenes.length);
  });

  it('toda regla tiene titulo y emoji', () => {
    for (const clave of CLAVES_REGLA) {
      expect(REGISTRY[clave].titulo.length).toBeGreaterThan(0);
      expect(REGISTRY[clave].emoji.length).toBeGreaterThan(0);
    }
  });

  it('gran_descuento es la unica con 🔥: es la que reporta ofertas genuinas, no errores', () => {
    const conFuego = CLAVES_REGLA.filter((c) => REGISTRY[c].emoji === '🔥');
    expect(conFuego).toEqual(['gran_descuento']);
  });
});

describe('PARAMETROS', () => {
  it('son los del original', () => {
    expect(PARAMETROS).toEqual({
      historialDias: 14,
      realertarSiBaja: 0.05,
      ofertaPermanenteDias: 7,
      ofertaMinHistorialDias: 7,
      ofertaRealBaja: 0.15,
      mismoPrecio: 0.02,
      minComparables: 8,
    });
  });
});
