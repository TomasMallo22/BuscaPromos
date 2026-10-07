/**
 * Port de `typical_from_changes` de turbo/db.py: la moda ponderada por duracion (regla de oro 3).
 * Los tres detalles que no son casualidad tienen su test cada uno:
 *   1. el tramo actual se excluye (pares fila/siguiente),
 *   2. en empate gana el precio mas viejo (`>` estricto),
 *   3. no cuentan los tramos sin stock ni los de promo excluida.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { AHORA, DIA, aFilas, cargarCaso, fila, type FilaCaso } from './casos.test-util.js';
import { duracionesPorPrecio, precioHabitual } from './precio-habitual.js';

interface CasoSerie {
  filas: FilaCaso[];
  esperado: { precioHabitualAhora?: number; duracionesSegundos?: Record<string, number> };
}

describe('precioHabitual — casos validados contra el original', () => {
  it.each(['inflado-sube-y-baja', 'real-caida-sostenida', 'empate-de-duracion'])('%s', (nombre) => {
    const caso = cargarCaso<CasoSerie>(nombre);
    expect(precioHabitual(aFilas(caso.filas), 14, AHORA)).toBe(caso.esperado.precioHabitualAhora);
  });

  it('empate-de-duracion: las duraciones empatan y aun asi gana el mas viejo', () => {
    const caso = cargarCaso<CasoSerie>('empate-de-duracion');
    const duraciones = duracionesPorPrecio(aFilas(caso.filas), 14, AHORA);
    expect(Object.fromEntries([...duraciones].map(([p, s]) => [String(p), s]))).toEqual(
      caso.esperado.duracionesSegundos,
    );
    // Con `>=` ganaria 800, el ultimo insertado.
    expect(precioHabitual(aFilas(caso.filas), 14, AHORA)).toBe(500);
  });
});

describe('precioHabitual — los tres detalles', () => {
  it('el tramo actual se excluye: el precio de hoy no contamina la referencia', () => {
    // 2 dias a 700, y hoy 100 hace 12 dias (mas tiempo). Si el ultimo tramo contara, ganaria 100.
    const filas = [fila(14, 700), fila(12, 100)];
    expect(precioHabitual(filas, 14, AHORA)).toBe(700);
  });

  it('el empate lo gana el precio que se inserto primero, aunque sea mayor', () => {
    const filas = [fila(10, 900), fila(7, 300), fila(4, 600)];
    // 900 y 300 sostienen 3 dias cada uno. Gana 900, el mas viejo.
    expect(precioHabitual(filas, 14, AHORA)).toBe(900);
  });

  it('un precio que vuelve suma sus tramos', () => {
    // 500 (2d) + 800 (3d) + 500 (2d) => 500 suma 4 dias y gana.
    const filas = [fila(10, 500), fila(8, 800), fila(5, 500), fila(3, 200)];
    expect(precioHabitual(filas, 14, AHORA)).toBe(500);
  });

  it('los tramos sin stock no cuentan', () => {
    const filas = [fila(13, 100, { enStock: false }), fila(3, 700), fila(1, 650)];
    expect(precioHabitual(filas, 14, AHORA)).toBe(700);
  });

  it('los tramos de promo excluida no cuentan', () => {
    const filas = [fila(13, 100, { promoExcluida: true }), fila(3, 700), fila(1, 650)];
    expect(precioHabitual(filas, 14, AHORA)).toBe(700);
  });
});

describe('precioHabitual — la ventana', () => {
  it('un tramo que empezo antes de la ventana cuenta solo desde el borde', () => {
    // 900 vigente desde hace 100 dias hasta hace 10: dentro de la ventana suma 4 dias.
    // 400 desde hace 10 hasta hace 1: suma 9 dias y gana.
    const filas = [fila(100, 900), fila(10, 400), fila(1, 50)];
    expect([...duracionesPorPrecio(filas, 14, AHORA)]).toEqual([
      [900, 4 * DIA],
      [400, 9 * DIA],
    ]);
  });

  it('un tramo que termino antes de la ventana no cuenta', () => {
    const filas = [fila(100, 900), fila(20, 400), fila(1, 50)];
    expect([...duracionesPorPrecio(filas, 14, AHORA)]).toEqual([[400, 13 * DIA]]);
  });

  it('la ventana se mide desde `ahora`, que es inyectado', () => {
    const filas = [fila(30, 700), fila(20, 900), fila(1, 50)];
    expect(precioHabitual(filas, 14, AHORA)).toBe(900);
    // Mirando desde hace 20 dias, solo existia el tramo de 700.
    expect(precioHabitual(filas.slice(0, 2), 14, AHORA - 20 * DIA)).toBe(700);
  });
});

describe('precioHabitual — bordes', () => {
  it('historial vacio: null', () => {
    expect(precioHabitual([], 14, AHORA)).toBeNull();
  });

  it('una sola fila: null (es el tramo actual)', () => {
    expect(precioHabitual([fila(30, 700)], 14, AHORA)).toBeNull();
  });

  it('todo sin stock: null', () => {
    const filas = [fila(10, 700, { enStock: false }), fila(5, 650, { enStock: false }), fila(1, 600)];
    expect(precioHabitual(filas, 14, AHORA)).toBeNull();
  });

  it('dos filas con el mismo ts no suman duracion', () => {
    expect(precioHabitual([fila(5, 700), fila(5, 650), fila(1, 600)], 14, AHORA)).toBe(650);
  });
});

describe('precioHabitual — propiedades', () => {
  const arbFilas = fc
    .array(
      fc.record({
        dt: fc.integer({ min: 0, max: 5 * DIA }),
        precio: fc.constantFrom(100, 250, 700, 1400),
        promoExcluida: fc.boolean(),
        enStock: fc.boolean(),
      }),
      { minLength: 0, maxLength: 12 },
    )
    .map((xs) => {
      let ts = AHORA - 40 * DIA;
      return xs.map(({ dt, ...resto }) => ({ ts: (ts += dt), ...resto }));
    });

  it('el resultado es null o el precio de un tramo previo valido', () => {
    fc.assert(
      fc.property(arbFilas, (filas) => {
        const r = precioHabitual(filas, 14, AHORA);
        if (r === null) return;
        const candidatos = filas.slice(0, -1).filter((f) => f.enStock && !f.promoExcluida);
        expect(candidatos.map((f) => f.precio)).toContain(r);
      }),
    );
  });

  it('cambiar el precio del tramo actual no cambia el resultado', () => {
    fc.assert(
      fc.property(arbFilas, fc.integer({ min: 1, max: 10_000 }), (filas, otro) => {
        fc.pre(filas.length > 0);
        const cambiadas = [...filas.slice(0, -1), { ...filas.at(-1)!, precio: otro }];
        expect(precioHabitual(cambiadas, 14, AHORA)).toBe(precioHabitual(filas, 14, AHORA));
      }),
    );
  });
});
