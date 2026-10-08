/**
 * Port de `check` de turbo/detect.py. La estructura es parte del contrato (ADR 0007):
 *
 *   sin stock                 -> corta (regla de oro 5; en el original, en `evaluate`)
 *   promo excluida            -> corta (opcionalmente un hit promo_usuario_nuevo)
 *   precio <= precio_absurdo  -> SOLO ese hit y corta
 *   acumula: caida_vs_historial, descuento_extremo XOR gran_descuento, vs_otras_tiendas,
 *            nuevo_vs_pasillo (solo si habitual === null)
 *
 * Todos los valores esperados se contrastaron contra el `check` del Python original.
 */
import { describe, expect, it } from 'vitest';
import { REGISTRY, UMBRALES_DEFAULT } from '../reglas/registry.js';
import { AHORA, aFilas, cargarCaso, fila, type FilaCaso } from './casos.test-util.js';
import { estadoOferta, type ResultadoOferta } from './estado-oferta.js';
import { evaluarReglas, type EntradaMotor, type ProductoEvaluado } from './motor.js';
import { precioHabitual } from './precio-habitual.js';

const producto = (precio: number, precioLista: number, extra: Partial<ProductoEvaluado> = {}): ProductoEvaluado => ({
  precio,
  precioLista,
  promoExcluida: false,
  enStock: true,
  ...extra,
});

const REAL: ResultadoOferta = { estado: 'real', desde: AHORA, precioReferencia: 1000 };
const INFLADO: ResultadoOferta = { estado: 'inflado', desde: AHORA, precioReferencia: null };

const entrada = (e: Partial<EntradaMotor> & Pick<EntradaMotor, 'producto'>): EntradaMotor => ({
  habitual: null,
  oferta: null,
  mediana: null,
  pasillo: null,
  ...e,
});

const reglas = (e: EntradaMotor, opciones?: Parameters<typeof evaluarReglas>[1]) =>
  evaluarReglas(e, opciones).map((d) => d.regla);

/** Entrada del motor desde una serie de historial, como la armaria el crawler. */
function desdeSerie(filas: readonly FilaCaso[], precioLista: number): EntradaMotor {
  const f = aFilas(filas);
  return entrada({
    producto: producto(f.at(-1)!.precio, precioLista),
    habitual: precioHabitual(f, 14, AHORA),
    oferta: estadoOferta(f, AHORA),
  });
}

describe('evaluarReglas — escenarios de la spec 001', () => {
  it('E3: 20 dias a $5.500 y aparece a $1.200 -> caida_vs_historial con ratio 0.218', () => {
    const d = evaluarReglas(desdeSerie([{ diasAtras: 20, precio: 5500, promoExcluida: false, enStock: true }, { diasAtras: 0, precio: 1200, promoExcluida: false, enStock: true }], 0));
    expect(d).toHaveLength(1);
    expect(d[0]).toMatchObject({ regla: REGISTRY.caida_vs_historial.clave, precioReferencia: 5500 });
    expect(d[0]!.ratio).toBeCloseTo(0.218, 3);
  });

  it('inflado-sube-y-baja con cartel de -50%: NO dispara nada', () => {
    const { filas } = cargarCaso<{ filas: FilaCaso[] }>('inflado-sube-y-baja');
    // $700 con $1400 tachado: ratio 0.5 contra el tachado, pero la oferta es `inflado`.
    expect(evaluarReglas(desdeSerie(filas, 1400))).toEqual([]);
  });

  it('real-caida-sostenida con tachado de $800: gran_descuento, porque la oferta es real', () => {
    const { filas } = cargarCaso<{ filas: FilaCaso[] }>('real-caida-sostenida');
    expect(evaluarReglas(desdeSerie(filas, 800))).toEqual([
      { regla: REGISTRY.gran_descuento.clave, precioReferencia: 800, ratio: 0.5, detalle: { precioHabitualPrevio: 700 } },
    ]);
  });

  it('E5 arranque ciego: con 3 dias de historial solo puede opinar el tachado', () => {
    const { filas } = cargarCaso<{ filas: FilaCaso[] }>('sin-historial-corto');
    // $300 con $1000 tachado: descuento_extremo (0.3 no), gran_descuento no (sin_historial).
    expect(reglas(desdeSerie(filas, 1000))).toEqual([]);
    expect(reglas(desdeSerie(filas, 2000))).toEqual([REGISTRY.descuento_extremo.clave]);
  });

  it('E5, matiz: caida_vs_historial SI puede disparar con 2 dias de historia', () => {
    // Herencia del original: el precio habitual existe apenas hay un tramo previo cerrado, no
    // hace falta `historial_dias` de historia. La spec (E5) y docs/03 seccion 7 dicen lo
    // contrario; este test fija el comportamiento real hasta que el dueño decida.
    const serie: FilaCaso[] = [
      { diasAtras: 3, precio: 500, promoExcluida: false, enStock: true },
      { diasAtras: 1, precio: 200, promoExcluida: false, enStock: true },
    ];
    expect(reglas(desdeSerie(serie, 0))).toEqual([REGISTRY.caida_vs_historial.clave]);
  });

  it('E10: sin stock no se alerta, aunque el precio sea absurdo', () => {
    expect(evaluarReglas(entrada({ producto: producto(1, 1000, { enStock: false }), habitual: 700 }))).toEqual([]);
  });

  it('E11: una promo de usuario nuevo no se alerta', () => {
    expect(evaluarReglas(entrada({ producto: producto(1, 1000, { promoExcluida: true }), habitual: 700 }))).toEqual([]);
  });
});

describe('evaluarReglas — los cortes tempranos', () => {
  it('precio_absurdo devuelve SOLO ese hit, aunque otras reglas dispararian', () => {
    const e = entrada({ producto: producto(5, 1000), habitual: 700, oferta: REAL, mediana: { precio: 800, nTiendas: 3 } });
    expect(evaluarReglas(e)).toEqual([
      { regla: REGISTRY.precio_absurdo.clave, precioReferencia: 1000, ratio: 0.005, detalle: {} },
    ]);
  });

  it('precio_absurdo es inclusivo: $10 dispara', () => {
    expect(reglas(entrada({ producto: producto(10, 0) }))).toEqual([REGISTRY.precio_absurdo.clave]);
  });

  it('precio_absurdo sin tachado: referencia y ratio null, sin dividir por cero', () => {
    expect(evaluarReglas(entrada({ producto: producto(0, 0) }))).toEqual([
      { regla: REGISTRY.precio_absurdo.clave, precioReferencia: null, ratio: null, detalle: {} },
    ]);
  });

  it('promo excluida con la opcion prendida: promo_usuario_nuevo con el umbral de descuento_extremo', () => {
    const p = producto(150, 1000, { promoExcluida: true, maxUnidadesPromo: 1 });
    expect(evaluarReglas(entrada({ producto: p }), { incluirPromoUsuarioNuevo: true })).toEqual([
      { regla: REGISTRY.promo_usuario_nuevo.clave, precioReferencia: 1000, ratio: 0.15, detalle: { maxUnidades: 1 } },
    ]);
  });

  it('promo excluida con la opcion prendida pero descuento flojo: nada', () => {
    const p = producto(300, 1000, { promoExcluida: true });
    expect(evaluarReglas(entrada({ producto: p }), { incluirPromoUsuarioNuevo: true })).toEqual([]);
  });

  it('promo excluida corta antes que precio_absurdo', () => {
    expect(evaluarReglas(entrada({ producto: producto(1, 0, { promoExcluida: true }) }))).toEqual([]);
  });
});

describe('evaluarReglas — descuento_extremo XOR gran_descuento', () => {
  it('al 10% del tachado con oferta real: SOLO descuento_extremo', () => {
    expect(reglas(entrada({ producto: producto(100, 1000), oferta: REAL }))).toEqual([
      REGISTRY.descuento_extremo.clave,
    ]);
  });

  it('al 40% del tachado con oferta real: gran_descuento', () => {
    expect(reglas(entrada({ producto: producto(400, 1000), oferta: REAL }))).toEqual([
      REGISTRY.gran_descuento.clave,
    ]);
  });

  it('gran_descuento exige oferta real: con inflado, sin_historial o sin oferta no dispara', () => {
    const sinHistorial: ResultadoOferta = { estado: 'sin_historial', desde: AHORA, precioReferencia: null };
    for (const oferta of [INFLADO, sinHistorial, null]) {
      expect(reglas(entrada({ producto: producto(400, 1000), oferta }))).toEqual([]);
    }
  });

  it('sin tachado no hay ni una ni otra', () => {
    expect(reglas(entrada({ producto: producto(400, 0), oferta: REAL }))).toEqual([]);
  });
});

describe('evaluarReglas — la acumulacion', () => {
  it('las reglas se acumulan en el orden del original', () => {
    const e = entrada({ producto: producto(100, 1000), habitual: 700, oferta: REAL, mediana: { precio: 800, nTiendas: 4 } });
    expect(evaluarReglas(e)).toEqual([
      { regla: REGISTRY.caida_vs_historial.clave, precioReferencia: 700, ratio: 100 / 700, detalle: {} },
      { regla: REGISTRY.descuento_extremo.clave, precioReferencia: 1000, ratio: 0.1, detalle: {} },
      { regla: REGISTRY.vs_otras_tiendas.clave, precioReferencia: 800, ratio: 0.125, detalle: { nTiendas: 4 } },
    ]);
  });

  it('caida_vs_historial informa el precio anterior si lo hay', () => {
    const e = entrada({ producto: producto(300, 0, { precioAnterior: 650 }), habitual: 700 });
    expect(evaluarReglas(e)[0]!.detalle).toEqual({ precioAnterior: 650 });
  });

  it('caida_vs_historial es inclusiva: exactamente la mitad dispara', () => {
    expect(reglas(entrada({ producto: producto(350, 0), habitual: 700 }))).toEqual([REGISTRY.caida_vs_historial.clave]);
  });

  it('un habitual de 0 no dispara caida_vs_historial (no divide por cero)', () => {
    expect(reglas(entrada({ producto: producto(300, 0), habitual: 0 }))).toEqual([]);
  });

  it('una mediana de 0 no dispara vs_otras_tiendas', () => {
    expect(reglas(entrada({ producto: producto(300, 0), mediana: { precio: 0, nTiendas: 2 } }))).toEqual([]);
  });
});

describe('evaluarReglas — nuevo_vs_pasillo', () => {
  const pasillo = { referencia: 2000, n: 8 };

  it('sin historial propio y muy barato para su gondola: dispara', () => {
    expect(evaluarReglas(entrada({ producto: producto(300, 0), pasillo }))).toEqual([
      { regla: REGISTRY.nuevo_vs_pasillo.clave, precioReferencia: 2000, ratio: 0.15, detalle: { nComparables: 8 } },
    ]);
  });

  it('con historial propio NO corre, aunque el ratio contra la gondola sea brutal', () => {
    expect(reglas(entrada({ producto: producto(300, 0), habitual: 400, pasillo }))).toEqual([]);
  });

  it('sin referencia de pasillo no corre', () => {
    expect(reglas(entrada({ producto: producto(300, 0) }))).toEqual([]);
  });
});

describe('evaluarReglas — umbrales', () => {
  it('se pueden pasar umbrales distintos a los default', () => {
    const e = entrada({ producto: producto(300, 0), habitual: 700 });
    expect(reglas(e)).toEqual([REGISTRY.caida_vs_historial.clave]);
    expect(reglas(e, { umbrales: { ...UMBRALES_DEFAULT, caida_vs_historial: 0.4 } })).toEqual([]);
  });

  it('un umbral null apaga la regla', () => {
    const e = entrada({ producto: producto(5, 0) });
    expect(reglas(e, { umbrales: { ...UMBRALES_DEFAULT, precio_absurdo: null } })).toEqual([]);
  });

  it('los umbrales default salen del registry', () => {
    for (const [clave, umbral] of Object.entries(UMBRALES_DEFAULT)) {
      expect(umbral).toBe(REGISTRY[clave as keyof typeof REGISTRY].umbral);
    }
  });
});

describe('evaluarReglas — la serie entera, como la veria el crawler', () => {
  it('reajustes cosmeticos con un tachado inflado no disparan', () => {
    const f = [fila(20, 700), fila(14, 712), fila(7, 698), fila(2, 705)];
    const e = entrada({
      producto: producto(705, 1410),
      habitual: precioHabitual(f, 14, AHORA),
      oferta: estadoOferta(f, AHORA),
    });
    expect(evaluarReglas(e)).toEqual([]);
  });
});
