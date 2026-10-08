/**
 * Leer las respuestas de Rappi. Puro: sin red, para testearlo contra los fixtures.
 *
 * Nada de esto asume la forma exacta del JSON. Rappi cambia el layout de sus componentes; lo
 * que se conserva es el nombre del componente y los campos del producto. Por eso se camina el
 * JSON entero buscando por forma (duck-test), y hay un test que agrega dos niveles de
 * anidamiento y verifica que se encuentran los mismos productos (E8 de la spec 001).
 */
import { z } from 'zod';
import { parsearPresentacion, type PromoKind } from '@buscapromos/core';
import type { ProductoNormalizado } from '../contrato.js';
import { TIENDAS_RAPPI, tipoTiendaRappi } from './tiendas.js';

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
 * Las tiendas de la lista (`TIENDAS_RAPPI`) que el router ofrece en una ubicacion: la primera de
 * cada tipo, en el orden de la lista. Ojo: de noche Rappi esconde la Turbo (verificado el
 * 2026-10-08 a las 22:37 ART); que no venga no quiere decir que no exista.
 */
export function tiendasRappi(router: unknown): Array<{ tipo: string; idExterno: string; lat: number | null; lng: number | null }> {
  const porTipo = new Map<string, { tipo: string; idExterno: string; lat: number | null; lng: number | null }>();
  for (const nodo of caminar(router)) {
    const tipo = nodo['store_type'];
    const id = nodo['store_id'];
    if (typeof tipo !== 'string' || id === undefined || id === null) continue;
    if (!tipoTiendaRappi(tipo) || porTipo.has(tipo)) continue;
    porTipo.set(tipo, {
      tipo,
      idExterno: String(id),
      lat: typeof nodo['lat'] === 'number' ? nodo['lat'] : null,
      lng: typeof nodo['lng'] === 'number' ? nodo['lng'] : null,
    });
  }
  return TIENDAS_RAPPI.flatMap((t) => {
    const encontrada = porTipo.get(t.tipo);
    return encontrada ? [encontrada] : [];
  });
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
    quantity: z.number().nullish(),
    unit_type: z.string().nullish(),
    sale_type: z.string().nullish(),
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

/** Las `unit_type` de Rappi que son peso o volumen. `und`, `mt` y `cm` no se comparan. */
const MEDIBLES = new Set(['gr', 'g', 'kg', 'ml', 'cc', 'l', 'lt']);
/** Hasta cuantas unidades se cree un multipack ("24 x 354 mL" existe; "45261 x" no). */
const MAX_PACK = 24;

/**
 * Que presentacion usar para el precio por kilo o litro. Rappi manda dos: el texto
 * (`presentation`) y la cantidad estructurada (`quantity` + `unit_type`), que es POR UNIDAD.
 * En el pasillo Bebidas de Turbo coinciden 348 de 351. Cuando no:
 *
 * - multipack: "4 x 237 mL" con quantity 237. El texto es el correcto (el precio es del pack).
 * - texto disparatado: "1 x 45261 L" en un vino de 1,12 L; "1 X 15 L" en un agua de 1,5 L. Lo
 *   estructurado es el correcto: sin esto, nuevo_vs_pasillo los marca como regalados.
 *
 * Regla: el texto gana si coincide con lo estructurado, o si es un multipack EXPLICITO ("N x"
 * y N veces la cantidad). Si no, lo estructurado. El parser es el del core: no se reimplementa.
 */
export function presentacionRappi(
  texto: string | null | undefined,
  cantidad: number | null | undefined,
  unidad: string | null | undefined,
): string | null {
  const limpio = textoONull(texto);
  const u = unidad?.toLowerCase() ?? '';
  const estructurada = cantidad && cantidad > 0 && MEDIBLES.has(u) ? `${cantidad} ${u}` : null;
  if (!limpio) return estructurada;
  if (!estructurada) return limpio;
  const delTexto = parsearPresentacion(limpio);
  const real = parsearPresentacion(estructurada);
  if (!delTexto || !real || delTexto.dimension !== real.dimension) return estructurada;
  const veces = delTexto.cantidad / real.cantidad;
  const multiplicador = Number(/^\s*(\d+)\s*[xX]/.exec(limpio)?.[1] ?? 1);
  const k = Math.round(veces);
  const esMultiplo = k >= 1 && k <= MAX_PACK && Math.abs(veces - k) / k < 0.05;
  return esMultiplo && k === multiplicador ? limpio : estructurada;
}

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
      presentacion: presentacionRappi(p.presentation, p.quantity, p.unit_type),
      imagenUrl: textoONull(p.image_url),
      ean: textoONull(p.ean),
      masterExterno: p.master_product_id ? String(p.master_product_id) : null,
      categoriaPath,
      precio: p.price,
      precioLista: p.real_price && p.real_price > 0 ? p.real_price : null,
      promoKind: promoKindRappi(p),
      enStock: p.in_stock,
      stock: p.stock ?? null,
      // "U" es por unidad; WW, WB, WP son por peso, y el precio no es el del paquete.
      seVendePorPeso: Boolean(p.sale_type) && p.sale_type !== 'U',
    });
  }
  return [...porId.values()];
}
