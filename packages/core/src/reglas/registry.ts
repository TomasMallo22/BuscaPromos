/**
 * La UNICA definicion de cada regla de deteccion (ADR 0007, regla de oro 10).
 *
 * De aca salen el enum `regla_clave` de Postgres (`npm run reglas:verificar` falla si hay
 * deriva), los titulos y emoji de Telegram, los chips de la UI y los defaults de
 * `suscripciones.reglas_habilitadas`. Si una clave, un titulo o un umbral aparece escrito en
 * otro lado, esta mal.
 *
 * Los umbrales son los de `DEFAULT_RULES` de `turbo/detect.py` (commit 431cb3f). Antes de
 * bajar uno, leé la skill `motor-deteccion`: cada falso positivo cuesta la confianza del usuario.
 */
import type { ReglaClave } from './tipos.js';

export interface DefinicionRegla<K extends ReglaClave = ReglaClave> {
  readonly clave: K;
  /**
   * Umbral default. Para `precio_absurdo` es un monto en pesos; para el resto, el ratio
   * `precio / referencia` a partir del cual dispara (menor es mas fuerte). `null` si la regla
   * no tiene umbral propio.
   */
  readonly umbral: number | null;
  readonly titulo: string;
  readonly emoji: string;
  /** Desempate al deduplicar por producto: menor gana. Ver docs/05-alertas-y-notificaciones.md. */
  readonly orden: number;
}

/** El orden de las propiedades es el orden en que `evaluarReglas` las considera. */
export const REGISTRY: { readonly [K in ReglaClave]: DefinicionRegla<K> } = {
  precio_absurdo: {
    clave: 'precio_absurdo',
    umbral: 10,
    titulo: 'Precio absurdo',
    emoji: '🚨',
    orden: 1,
  },
  caida_vs_historial: {
    clave: 'caida_vs_historial',
    umbral: 0.5,
    titulo: 'Bajó vs. su precio habitual',
    emoji: '🚨',
    orden: 2,
  },
  descuento_extremo: {
    clave: 'descuento_extremo',
    umbral: 0.2,
    titulo: 'Descuento extremo',
    emoji: '🚨',
    orden: 3,
  },
  gran_descuento: {
    clave: 'gran_descuento',
    umbral: 0.5,
    titulo: 'Oferta real fuerte',
    emoji: '🔥',
    orden: 4,
  },
  vs_otras_tiendas: {
    clave: 'vs_otras_tiendas',
    umbral: 0.5,
    titulo: 'Más barato que en otras tiendas',
    emoji: '🚨',
    orden: 5,
  },
  nuevo_vs_pasillo: {
    clave: 'nuevo_vs_pasillo',
    umbral: 0.2,
    titulo: 'Producto nuevo muy barato para su góndola',
    emoji: '🚨',
    orden: 6,
  },
  // Sin umbral propio: en el original se evalua con el de `descuento_extremo`. Esta apagada por
  // default (regla de oro 5): la promo de usuario nuevo de Rappi no aplica a cuentas existentes.
  promo_usuario_nuevo: {
    clave: 'promo_usuario_nuevo',
    umbral: null,
    titulo: 'Promo usuario nuevo',
    emoji: '🚨',
    orden: 7,
  },
};

export const CLAVES_REGLA = Object.keys(REGISTRY) as readonly ReglaClave[];

/** Parametros del motor que no son el umbral de una regla. Ver docs/03-motor-deteccion.md. */
export const PARAMETROS = {
  /** Ventana del precio habitual. */
  historialDias: 14,
  /** Capa 2 del anti-spam: re-alertar solo si bajo mas que esto respecto del ultimo aviso. */
  realertarSiBaja: 0.05,
  /** Si cuesta lo mismo hace esta cantidad de dias, ese es su precio normal: `inflado`. */
  ofertaPermanenteDias: 7,
  /** Historial previo al cambio necesario para opinar. Menos que esto: `sin_historial`. */
  ofertaMinHistorialDias: 7,
  /** Cuanto tiene que bajar contra el precio habitual previo para ser una oferta `real`. */
  ofertaRealBaja: 0.15,
  /** Reajustes de +-2% cuentan como el mismo precio (`SAME_PRICE` en el original). */
  mismoPrecio: 0.02,
  /** Comparables del mismo sub-pasillo y dimension para `nuevo_vs_pasillo`. */
  minComparables: 8,
} as const;

export type Parametros = { readonly [K in keyof typeof PARAMETROS]: number };
