/**
 * Los tipos del dominio. Espejo de los enums de `supabase/migrations/0001_enums_y_schemas.sql`.
 *
 * Se mantienen a mano y no se generan: son el vocabulario del dominio y aparecen en firmas de
 * funciones puras que no tocan la base. `tipos.test.ts` verifica que no se desincronicen del SQL.
 */

/** Proveedores soportados. `pedidosya` existe pero no se implementa: ver ADR 0011. */
export type TipoProveedor = 'rappi' | 'vtex' | 'coto' | 'laanonima' | 'sepa' | 'pedidosya';

/**
 * Que clase de promocion tiene un precio.
 *
 * Separado a proposito de "¿esta promo le aplica al usuario?", que es una politica por
 * proveedor (`promoKindsExcluidos`). El repo original tenia un booleano que cargaba los dos
 * significados y eso impedia soportar proveedores con mas de un tipo de promo. Ver ADR 0005.
 */
export type PromoKind =
  | 'ninguna'
  | 'descuento_lista'
  | 'promo_usuario_nuevo'
  | 'segunda_unidad'
  | 'descuento_bancario'
  | 'combo'
  | 'precio_cuidado'
  | 'desconocida';

/**
 * El resultado de clasificar el precio actual contra el historial **propio**, no contra el
 * precio tachado del retailer. Ver docs/03-motor-deteccion.md seccion 2.
 *
 * - `real`: bajo hace poco respecto de su precio habitual previo.
 * - `inflado`: cuesta lo mismo hace `oferta_permanente_dias` o mas — ese **es** su precio
 *   normal, por mas que el retailer muestre un tachado mas alto.
 * - `sin_historial`: lo vemos hace muy poco para opinar.
 */
export type EstadoOferta = 'real' | 'inflado' | 'sin_historial';

/**
 * `ReglaClave` vive en `reglas/tipos.ts`, no aca: la lint rule `no-clave-regla-literal` prohibe
 * escribir una clave de regla fuera de `reglas/`, y la declaracion del tipo es justamente la
 * lista de claves. Ver ADR 0007.
 */
export type { ReglaClave } from './reglas/tipos.js';

/**
 * De donde sale la identidad canonica de un producto.
 *
 * **Solo `ean` y `rappi_master` habilitan `vs_otras_tiendas`** (regla de oro 15): un match por
 * nombre juntaria "Yogur Ser 190g" con "Yogur Ser 190g x4" y produciria un falso positivo
 * convincente, que es la peor clase. Ver ADR 0006.
 */
export type OrigenClave = 'ean' | 'rappi_master' | 'nombre_marca_presentacion';

/** `descartada` no es un error: ver regla de oro 6. */
export type EstadoCorrida = 'en_curso' | 'ok' | 'descartada' | 'error';

export type TipoCanal = 'telegram' | 'email' | 'web';

/** Los origenes de clave que habilitan comparar precios entre tiendas. Regla de oro 15. */
export const ORIGENES_COMPARABLES: readonly OrigenClave[] = ['ean', 'rappi_master'];

/** `true` si esta identidad es suficientemente confiable para `vs_otras_tiendas`. */
export const habilitaComparacion = (origen: OrigenClave): boolean =>
  ORIGENES_COMPARABLES.includes(origen);

/** Un tramo del historial de precios de un producto en una tienda. */
export interface FilaPrecio {
  /** Epoch en **segundos**. El core no usa Date: el reloj se inyecta. */
  readonly ts: number;
  readonly precio: number;
  /** `true` si esta promo esta en `promoKindsExcluidos` del proveedor. */
  readonly promoExcluida: boolean;
  readonly enStock: boolean;
}
