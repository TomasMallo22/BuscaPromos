/**
 * Lo que recibe y lo que devuelve el motor. Viven aparte de `motor.ts` porque el registry los
 * necesita para tipar `evaluar` y el motor necesita al registry.
 */
import type { ReglaClave } from '../reglas/tipos.js';
import type { ResultadoOferta } from './estado-oferta.js';
import type { ReferenciaPasillo } from './pasillo.js';

/** El estado actual de un producto en una tienda. */
export interface ProductoEvaluado {
  readonly precio: number;
  /** El precio tachado del proveedor, o 0 si no hay. Un insumo, no una referencia (regla de oro 1). */
  readonly precioLista: number;
  /** `true` si su promo esta en `promoKindsExcluidos` del proveedor. */
  readonly promoExcluida: boolean;
  readonly enStock: boolean;
  /** El precio de la fila anterior del changelog, si se conoce. Solo para el detalle. */
  readonly precioAnterior?: number | null;
  /** Tope de unidades de la promo excluida ("Max. 1 Ud."). Solo para el detalle. */
  readonly maxUnidadesPromo?: number | null;
}

/** La mediana del mismo producto canonico en otras tiendas. Solo con identidad `ean` o `rappi_master`. */
export interface MedianaOtrasTiendas {
  readonly precio: number;
  readonly nTiendas: number;
}

/** Todo lo que el motor necesita, ya calculado. El motor no hace I/O. */
export interface EntradaMotor {
  readonly producto: ProductoEvaluado;
  /** `precioHabitual(filas, historialDias, ahora)`. `null` si no hay historial propio. */
  readonly habitual: number | null;
  /** `estadoOferta(filas, ahora)`. */
  readonly oferta: ResultadoOferta | null;
  readonly mediana: MedianaOtrasTiendas | null;
  /** `referenciaPasillo(...)`. Solo hace falta calcularla si `habitual === null`. */
  readonly pasillo: ReferenciaPasillo | null;
}

/** Una regla que disparo. Es lo que se persiste en `hallazgos`. */
export interface Disparo {
  readonly regla: ReglaClave;
  readonly precioReferencia: number | null;
  /** `precio / precioReferencia`: menor es mas fuerte. `null` si no hay referencia. */
  readonly ratio: number | null;
  /** Va a `hallazgos.detalle` (jsonb). El texto lo arma quien lo muestra. */
  readonly detalle: Readonly<Record<string, number>>;
}
