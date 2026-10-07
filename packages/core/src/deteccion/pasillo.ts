/**
 * La referencia de `nuevo_vs_pasillo`: el precio por kilo o litro de los mas baratos del mismo
 * sub-pasillo. Port de `unit_index` y `subaisle_reference` de turbo/detect.py. Ver
 * docs/03-motor-deteccion.md seccion 4.
 */
import { parsearPresentacion, type Dimension } from '../normalizacion/presentacion.js';
import { PARAMETROS } from '../reglas/registry.js';

export interface ProductoPasillo {
  readonly subPasillo: string;
  readonly presentacion: string | null;
  readonly precio: number;
  readonly promoExcluida: boolean;
  readonly enStock: boolean;
}

export interface ReferenciaPasillo {
  /** Lo que costaria este producto al precio por unidad de los mas baratos de su gondola. */
  readonly referencia: number;
  /** Cuantos comparables hubo, sin contar al propio producto. */
  readonly n: number;
}

/** Precios por unidad ordenados, por `(sub-pasillo, dimension)`. */
export class IndicePasillo {
  // Mapas anidados y no una clave string concatenada: un sub-pasillo con el separador en el
  // nombre no puede colisionar con otro.
  readonly #porPasillo = new Map<string, Map<Dimension, number[]>>();

  agregar(subPasillo: string, dimension: Dimension, precioPorUnidad: number): void {
    let porDimension = this.#porPasillo.get(subPasillo);
    if (!porDimension) this.#porPasillo.set(subPasillo, (porDimension = new Map()));
    let precios = porDimension.get(dimension);
    if (!precios) porDimension.set(dimension, (precios = []));
    precios.push(precioPorUnidad);
  }

  ordenar(): void {
    for (const porDimension of this.#porPasillo.values()) {
      for (const precios of porDimension.values()) precios.sort((a, b) => a - b);
    }
  }

  precios(subPasillo: string, dimension: Dimension): readonly number[] {
    return this.#porPasillo.get(subPasillo)?.get(dimension) ?? [];
  }

  *claves(): Generator<[string, Dimension]> {
    for (const [subPasillo, porDimension] of this.#porPasillo) {
      for (const dimension of porDimension.keys()) yield [subPasillo, dimension];
    }
  }
}

/** Solo entran los productos a la venta: en stock, sin promo excluida y con precio > 0. */
export function indicePasillo(productos: Iterable<ProductoPasillo>): IndicePasillo {
  const indice = new IndicePasillo();
  for (const p of productos) {
    const q = parsearPresentacion(p.presentacion);
    if (q && p.enStock && !p.promoExcluida && p.precio > 0) {
      indice.agregar(p.subPasillo, q.dimension, p.precio / q.cantidad);
    }
  }
  indice.ordenar();
  return indice;
}

/** Primer indice `i` con `xs[i] >= x` (`bisect.bisect_left`). `xs` ordenado. */
function bisectIzquierda(xs: readonly number[], x: number): number {
  let lo = 0;
  let hi = xs.length;
  while (lo < hi) {
    const medio = (lo + hi) >>> 1;
    if (xs[medio]! < x) lo = medio + 1;
    else hi = medio;
  }
  return lo;
}

/**
 * La referencia del producto contra su sub-pasillo, sin contarlo a el. `null` si su
 * presentacion no es de peso o volumen, o si hay menos de `minComparables` comparables.
 *
 * Como en el original, se saca **una** ocurrencia del propio precio por unidad, encontrada por
 * busqueda binaria. Busca el precio, no el producto: si el producto no esta indexado pero otro
 * tiene su mismo precio por unidad, se saca al otro.
 */
export function referenciaPasillo(
  indice: IndicePasillo,
  producto: ProductoPasillo,
  minComparables: number = PARAMETROS.minComparables,
): ReferenciaPasillo | null {
  const q = parsearPresentacion(producto.presentacion);
  if (!q) return null;
  const precios = indice.precios(producto.subPasillo, q.dimension);
  const propio = producto.precio / q.cantidad;
  const i = bisectIzquierda(precios, propio);
  const otros = i < precios.length && precios[i] === propio ? precios.toSpliced(i, 1) : precios;
  if (otros.length < minComparables) return null;
  // Division ENTERA, a proposito: con 8 comparables da indice 0, que es el minimo y no "el
  // percentil 10". Asi esta en el original. No lo "arregles" con interpolacion.
  return { referencia: otros[Math.floor(otros.length / 10)]! * q.cantidad, n: otros.length };
}
