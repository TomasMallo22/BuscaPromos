/**
 * La UNICA definicion de cada regla de deteccion (ADR 0007, regla de oro 10).
 *
 * De aca salen el enum `regla_clave` de Postgres (`npm run reglas:verificar` falla si hay
 * deriva), los titulos y emoji de Telegram, los chips de la UI y los defaults de
 * `suscripciones.reglas_habilitadas`. Si una clave, un titulo o un umbral aparece escrito en
 * otro lado, esta mal.
 *
 * Los umbrales y las condiciones son los de `DEFAULT_RULES` y `check` de `turbo/detect.py`
 * (commit 431cb3f). Antes de bajar un umbral, leé la skill `motor-deteccion`: cada falso
 * positivo cuesta la confianza del usuario.
 *
 * Cada regla sabe si dispara (`evaluar`), pero **no** en que orden ni cual corta a cual: esa
 * estructura vive en `deteccion/motor.ts` y es parte del contrato.
 */
import type { Disparo, EntradaMotor } from '../deteccion/entrada.js';
import type { ReglaClave } from './tipos.js';

/** Umbral por regla. `null` apaga la regla. */
export type Umbrales = { readonly [K in ReglaClave]: number | null };

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
  /** `null` si no dispara. Pura: todo lo que necesita viene en la entrada. */
  readonly evaluar: (e: EntradaMotor, u: Umbrales) => Disparo | null;
}

/** El orden de las propiedades es el orden en que `evaluarReglas` las considera. */
export const REGISTRY: { readonly [K in ReglaClave]: DefinicionRegla<K> } = {
  precio_absurdo: {
    clave: 'precio_absurdo',
    umbral: 10,
    titulo: 'Precio absurdo',
    emoji: '🚨',
    orden: 1,
    // $0, $1...: no hace falta mas analisis. El tachado se informa si existe, nada mas.
    evaluar: ({ producto: { precio, precioLista } }, u) =>
      u.precio_absurdo !== null && precio <= u.precio_absurdo
        ? {
            regla: 'precio_absurdo',
            precioReferencia: precioLista || null,
            ratio: precioLista ? precio / precioLista : null,
            detalle: {},
          }
        : null,
  },
  caida_vs_historial: {
    clave: 'caida_vs_historial',
    umbral: 0.5,
    titulo: 'Bajó vs. su precio habitual',
    emoji: '🚨',
    orden: 2,
    evaluar: ({ producto: { precio, precioAnterior }, habitual }, u) =>
      u.caida_vs_historial !== null && habitual && precio / habitual <= u.caida_vs_historial
        ? {
            regla: 'caida_vs_historial',
            precioReferencia: habitual,
            ratio: precio / habitual,
            detalle: precioAnterior ? { precioAnterior } : {},
          }
        : null,
  },
  descuento_extremo: {
    clave: 'descuento_extremo',
    umbral: 0.2,
    titulo: 'Descuento extremo',
    emoji: '🚨',
    orden: 3,
    evaluar: ({ producto: { precio, precioLista } }, u) =>
      u.descuento_extremo !== null && precioLista > 0 && precio / precioLista <= u.descuento_extremo
        ? { regla: 'descuento_extremo', precioReferencia: precioLista, ratio: precio / precioLista, detalle: {} }
        : null,
  },
  gran_descuento: {
    clave: 'gran_descuento',
    umbral: 0.5,
    titulo: 'Oferta real fuerte',
    emoji: '🔥',
    orden: 4,
    // La unica que exige `estadoOferta === 'real'`: reporta ofertas genuinas, no errores, asi
    // que un tachado alto sobre el precio de siempre no la dispara.
    evaluar: ({ producto: { precio, precioLista }, oferta }, u) =>
      precioLista > 0 &&
      u.gran_descuento &&
      precio / precioLista <= u.gran_descuento &&
      oferta?.estado === 'real'
        ? {
            regla: 'gran_descuento',
            precioReferencia: precioLista,
            ratio: precio / precioLista,
            detalle: oferta.precioReferencia === null ? {} : { precioHabitualPrevio: oferta.precioReferencia },
          }
        : null,
  },
  vs_otras_tiendas: {
    clave: 'vs_otras_tiendas',
    umbral: 0.5,
    titulo: 'Más barato que en otras tiendas',
    emoji: '🚨',
    orden: 5,
    evaluar: ({ producto: { precio }, mediana }, u) =>
      u.vs_otras_tiendas !== null && mediana?.precio && precio / mediana.precio <= u.vs_otras_tiendas
        ? {
            regla: 'vs_otras_tiendas',
            precioReferencia: mediana.precio,
            ratio: precio / mediana.precio,
            detalle: { nTiendas: mediana.nTiendas },
          }
        : null,
  },
  nuevo_vs_pasillo: {
    clave: 'nuevo_vs_pasillo',
    umbral: 0.2,
    titulo: 'Producto nuevo muy barato para su góndola',
    emoji: '🚨',
    orden: 6,
    // La red para productos nuevos: corre SOLO sin historial propio, que es justo cuando las
    // demas reglas no pueden opinar.
    evaluar: ({ producto: { precio }, habitual, pasillo }, u) =>
      habitual === null && pasillo && u.nuevo_vs_pasillo && precio / pasillo.referencia <= u.nuevo_vs_pasillo
        ? {
            regla: 'nuevo_vs_pasillo',
            precioReferencia: pasillo.referencia,
            ratio: precio / pasillo.referencia,
            detalle: { nComparables: pasillo.n },
          }
        : null,
  },
  // Sin umbral propio: se evalua con el de `descuento_extremo`, como en el original. Solo corre
  // si se pide explicitamente (regla de oro 5): la promo de usuario nuevo de Rappi no aplica a
  // cuentas existentes.
  promo_usuario_nuevo: {
    clave: 'promo_usuario_nuevo',
    umbral: null,
    titulo: 'Promo usuario nuevo',
    emoji: '🚨',
    orden: 7,
    evaluar: ({ producto: { precio, precioLista, maxUnidadesPromo } }, u) =>
      u.descuento_extremo !== null && precioLista > 0 && precio / precioLista <= u.descuento_extremo
        ? {
            regla: 'promo_usuario_nuevo',
            precioReferencia: precioLista,
            ratio: precio / precioLista,
            detalle: maxUnidadesPromo ? { maxUnidades: maxUnidadesPromo } : {},
          }
        : null,
  },
};

export const CLAVES_REGLA = Object.keys(REGISTRY) as readonly ReglaClave[];

export const UMBRALES_DEFAULT: Umbrales = Object.fromEntries(
  CLAVES_REGLA.map((clave) => [clave, REGISTRY[clave].umbral]),
) as Umbrales;

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
  /**
   * Otras tiendas con el mismo producto para que `vs_otras_tiendas` opine. NO esta en el
   * original, donde la regla nunca tuvo mas de una tienda real: con una sola referencia, un
   * error de precio en la otra tienda seria un falso positivo convincente (spec 002, E5).
   */
  minTiendasMediana: 2,
} as const;

export type Parametros = { readonly [K in keyof typeof PARAMETROS]: number };
