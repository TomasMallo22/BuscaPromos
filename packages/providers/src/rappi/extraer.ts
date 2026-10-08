/**
 * Leer las respuestas de Rappi. Puro: sin red, para testearlo contra los fixtures.
 *
 * Nada de esto asume la forma exacta del JSON. Rappi cambia el layout de sus componentes; lo
 * que se conserva es el nombre del componente y los campos del producto. Por eso se camina el
 * JSON entero buscando por forma (duck-test), y hay un test que agrega dos niveles de
 * anidamiento y verifica que se encuentran los mismos productos (E8 de la spec 001).
 */
import { z } from 'zod';
import type { PromoKind } from '@buscapromos/core';
import type { ProductoNormalizado } from '../contrato.js';

type Objeto = Record<string, unknown>;
const esObjeto = (x: unknown): x is Objeto => typeof x === 'object' && x !== null;

/** Recorre todo el JSON en profundidad, en orden de documento. */
function* caminar(x: unknown): Generator<Objeto> {
  if (Array.isArray(x)) {
    for (const v of x) yield* caminar(v);
  } else if (esObjeto(x)) {
    yield x;
    for (const v of Object.values(x)) yield* caminar(v);
  }
}

/**
 * La tienda Turbo de una ubicacion: el primer nodo con `store_type === 'turbo'` y `store_id`.
 * `null` si no hay. Ojo: de noche, con Turbo cerrado, el router no la lista (verificado el
 * 2026-10-08 a las 22:37 ART): `null` no quiere decir "sin cobertura".
 */
export function tiendaTurbo(router: unknown): { idExterno: string; lat: number | null; lng: number | null } | null {
  for (const nodo of caminar(router)) {
    if (nodo['store_type'] === 'turbo' && nodo['store_id'] !== undefined && nodo['store_id'] !== null) {
      const lat = typeof nodo['lat'] === 'number' ? nodo['lat'] : null;
      const lng = typeof nodo['lng'] === 'number' ? nodo['lng'] : null;
      return { idExterno: String(nodo['store_id']), lat, lng };
    }
  }
  return null;
}

export interface Grupo {
  readonly id: number;
  readonly nombre: string;
  readonly cantidad: number;
}

const grupo = z
  .object({ id: z.number(), name: z.string(), product_count: z.number().optional() })
  .passthrough()
  .transform((g): Grupo => ({ id: g.id, nombre: g.name, cantidad: g.product_count ?? 0 }));

/** Los pasillos: `aisles_icons_carousel.resource.aisle_icons`. */
export function pasillos(arbol: unknown): Grupo[] {
  for (const nodo of caminar(arbol)) {
    if (nodo['name'] === 'aisles_icons_carousel') {
      const recurso = nodo['resource'];
      const iconos = esObjeto(recurso) ? recurso['aisle_icons'] : undefined;
      return z.array(grupo).parse(iconos);
    }
  }
  throw new Error('Rappi: no aparecio el componente aisles_icons_carousel en aisles_tree');
}

/** Los sub-pasillos de un pasillo: cada componente `aisles` trae uno en `resource`. */
export function subPasillos(respuesta: unknown): Grupo[] {
  const vistos = new Map<number, Grupo>();
  for (const nodo of caminar(respuesta)) {
    if (nodo['name'] === 'aisles' && esObjeto(nodo['resource'])) {
      const g = grupo.parse(nodo['resource']);
      if (!vistos.has(g.id)) vistos.set(g.id, g);
    }
  }
  return [...vistos.values()];
}

// Estricto en lo que se usa: si `price` deja de ser un numero, tiene que fallar fuerte y ya.
// Permisivo en el resto (`passthrough`): si Rappi agrega un campo, no es noticia.
const productoRappi = z
  .object({
    product_id: z.union([z.string(), z.number()]),
    name: z.string(),
    price: z.number(),
    real_price: z.number().nullish(),
    in_stock: z.boolean(),
    stock: z.number().nullish(),
    has_global_offers: z.boolean().nullish(),
    global_offer_max_quantity: z.number().nullish(),
    master_product_id: z.union([z.string(), z.number()]).nullish(),
    presentation: z.string().nullish(),
    trademark: z.string().nullish(),
    image_url: z.string().nullish(),
    ean: z.string().nullish(),
  })
  .passthrough();

/** Que promo es. La de cuenta nueva se declara excluida en las politicas, no aca. */
export function promoKindRappi(p: {
  price: number;
  real_price?: number | null | undefined;
  has_global_offers?: boolean | null | undefined;
  global_offer_max_quantity?: number | null | undefined;
}): PromoKind {
  if (p.has_global_offers && p.global_offer_max_quantity === 1) return 'promo_usuario_nuevo';
  if (p.real_price && p.real_price > p.price) return 'descuento_lista';
  return 'ninguna';
}

const textoONull = (s: string | null | undefined): string | null => (s && s.trim() ? s.trim() : null);

/**
 * Los productos de una respuesta, normalizados. Duck-test: todo objeto con `product_id` y
 * `price` es un producto, este donde este. Si un producto aparece dos veces, cuenta una.
 */
export function productos(respuesta: unknown, categoriaPath: readonly string[]): ProductoNormalizado[] {
  const porId = new Map<string, ProductoNormalizado>();
  for (const nodo of caminar(respuesta)) {
    if (!('product_id' in nodo && 'price' in nodo)) continue;
    const p = productoRappi.parse(nodo);
    const id = String(p.product_id);
    if (porId.has(id)) continue;
    porId.set(id, {
      idExterno: id,
      nombre: p.name.trim(),
      marca: textoONull(p.trademark),
      presentacion: textoONull(p.presentation),
      imagenUrl: textoONull(p.image_url),
      ean: textoONull(p.ean),
      masterExterno: p.master_product_id ? String(p.master_product_id) : null,
      categoriaPath,
      precio: p.price,
      precioLista: p.real_price && p.real_price > 0 ? p.real_price : null,
      promoKind: promoKindRappi(p),
      enStock: p.in_stock,
      stock: p.stock ?? null,
    });
  }
  return [...porId.values()];
}
