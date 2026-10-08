/**
 * El contrato de un proveedor de precios. Agregar uno (VTEX, Coto) no tiene que obligar a
 * tocar `packages/core`: si lo obliga, el contrato esta mal. Ver docs/04-contrato-proveedores.md.
 */
import type { OrigenClave, PromoKind, TipoProveedor } from '@buscapromos/core';
import type { ClienteHttp } from './cliente-http.js';

/** Todo lo que varia entre proveedores es declarativo, no `if`s en el codigo. */
export interface PoliticasProveedor {
  /** Regla de oro 8: en Rappi desaparecer del catalogo es sin stock; VTEX lo deja listado. */
  readonly faltanteEsSinStock: boolean;
  /** Promos que no le aplican al usuario. Excluidas de las cuatro cosas: ver docs/04. */
  readonly promoKindsExcluidos: readonly PromoKind[];
  /** Cuantos niveles de `categoriaPath` forman el "sub-pasillo" de nuevo_vs_pasillo. */
  readonly nivelAgrupacionPasillo: number;
  readonly msEntreRequests: number;
  readonly maxPaginasPorGrupo: number;
}

/** Donde esta el usuario. DATO PERSONAL: nunca en logs (regla de oro 14). */
export interface Ubicacion {
  readonly lat: number;
  readonly lng: number;
}

export interface TiendaResuelta {
  readonly idExterno: string;
  readonly nombre: string | null;
  /** Las coordenadas con las que se consulta la tienda. */
  readonly consulta: Ubicacion;
}

export interface ProductoNormalizado {
  readonly idExterno: string;
  readonly nombre: string;
  readonly marca: string | null;
  /** "1 x 473 mL": lo parsea packages/core. */
  readonly presentacion: string | null;
  readonly imagenUrl: string | null;
  readonly ean: string | null;
  /** `master_product_id` de Rappi. */
  readonly masterExterno: string | null;
  readonly categoriaPath: readonly string[];
  readonly precio: number;
  /** El precio tachado. Un insumo, no una referencia (regla de oro 1). */
  readonly precioLista: number | null;
  readonly promoKind: PromoKind;
  readonly enStock: boolean;
  readonly stock: number | null;
}

/** Un grupo del catalogo (un sub-pasillo). */
export interface LoteProductos {
  readonly categoriaPath: readonly string[];
  readonly productos: readonly ProductoNormalizado[];
  /** Si viene, el grupo fallo: va a `corridas.grupos_fallidos` y sus productos NO se marcan sin stock (regla de oro 7). */
  readonly falloMotivo?: string;
}

/** Donde el proveedor guarda y lee su token entre corridas. Lo implementa el crawler, contra la DB. */
export interface AlmacenCredenciales {
  leer(): Promise<{ token: string; expiraAt: Date } | null>;
  guardar(token: string, expiraAt: Date): Promise<void>;
}

export interface CtxProveedor {
  readonly http: ClienteHttp;
  readonly credenciales: AlmacenCredenciales;
}

export interface Proveedor {
  readonly id: string;
  readonly tipo: TipoProveedor;
  readonly politicas: PoliticasProveedor;
  /** `null` si no hay tienda en esa zona (o no la hay en este momento: ver Rappi de noche). */
  resolverTienda(u: Ubicacion, ctx: CtxProveedor): Promise<TiendaResuelta | null>;
  /**
   * `AsyncIterable` y no `Promise<Producto[]>`: permite aplicar lotes sin tener el catalogo
   * entero en memoria, y el `falloMotivo` por lote modela los grupos fallidos sin un canal
   * lateral de errores.
   */
  recorrer(t: TiendaResuelta, ctx: CtxProveedor): AsyncIterable<LoteProductos>;
  /** Una URL donde el producto se puede comprar EN ESA tienda. */
  urlProducto(p: { nombre: string }, t: { idExterno: string }): string;
  claveCanonica(p: ProductoNormalizado): { clave: string; origen: OrigenClave } | null;
}

/** "Excluir" una promo son cuatro cosas: ver docs/04-contrato-proveedores.md. */
export const promoExcluida = (promoKind: PromoKind, pol: PoliticasProveedor): boolean =>
  pol.promoKindsExcluidos.includes(promoKind);
