/**
 * ¿El precio actual es una oferta de verdad? Port de `offer_status` de turbo/detect.py.
 * Ver docs/03-motor-deteccion.md seccion 2.
 *
 * Compara contra lo que costo antes segun el historial **propio**, no contra el precio tachado
 * del retailer, que puede estar inflado para aparentar un descuento (regla de oro 1).
 */
import { PARAMETROS, type Parametros } from '../reglas/registry.js';
import type { EstadoOferta, FilaPrecio } from '../tipos.js';
import { precioHabitual } from './precio-habitual.js';

const DIA = 86400;

export interface ResultadoOferta {
  readonly estado: EstadoOferta;
  /** Desde cuando cuesta (aproximadamente, +-2%) lo que cuesta hoy. Epoch en segundos. */
  readonly desde: number;
  /** El precio habitual previo al cambio. `null` si no se llego a calcular. */
  readonly precioReferencia: number | null;
}

/**
 * Clasifica el precio actual en `real` | `inflado` | `sin_historial`.
 *
 * `filas`: cambios de precio en orden cronologico; la ultima es el estado actual. Devuelve
 * `null` si no hay filas: no hay nada que clasificar.
 */
export function estadoOferta(
  filas: readonly FilaPrecio[],
  ahora: number,
  p: Parametros = PARAMETROS,
): ResultadoOferta | null {
  if (filas.length === 0) return null;
  const actual = filas.at(-1)!.precio;

  // Los retailers mueven miles de precios +-1-2% por dia. Sin este colapso, cada reajuste
  // cosmetico reiniciaria el reloj de "desde cuando cuesta esto". `actual > 0` evita dividir
  // por cero con un precio de $0.
  let i = filas.length - 1;
  while (i > 0 && actual > 0 && Math.abs(filas[i - 1]!.precio - actual) / actual <= p.mismoPrecio) {
    i -= 1;
  }
  const desde = filas[i]!.ts;

  // Ya cuesta lo mismo hace una semana: ese ES su precio normal, por mas tachado que muestre.
  if (ahora - desde >= p.ofertaPermanenteDias * DIA) {
    return { estado: 'inflado', desde, precioReferencia: null };
  }
  if (i === 0 || desde - filas[0]!.ts < p.ofertaMinHistorialDias * DIA) {
    return { estado: 'sin_historial', desde, precioReferencia: null };
  }
  // OJO: la ventana se evalua AL MOMENTO DEL CAMBIO (`desde`), no en `ahora`. La fila `i` es el
  // tramo actual y `precioHabitual` la deja afuera.
  const ref = precioHabitual(filas.slice(0, i + 1), p.historialDias, desde);
  if (ref === null) {
    return { estado: 'sin_historial', desde, precioReferencia: null };
  }
  const estado = actual <= ref * (1 - p.ofertaRealBaja) ? 'real' : 'inflado';
  return { estado, desde, precioReferencia: ref };
}
