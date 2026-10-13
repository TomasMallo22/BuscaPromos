/**
 * La referencia de `vs_otras_tiendas`: la mediana del precio del MISMO producto canonico en
 * otras tiendas (spec 002). Mediana y no promedio: una tienda con un precio disparatado no
 * mueve la referencia.
 *
 * Quien llama ya filtro: solo identidad `ean` o `rappi_master` (regla de oro 15), solo en stock
 * y sin promo excluida (las cuatro exclusiones de docs/04).
 */
import { PARAMETROS, type Parametros } from '../reglas/registry.js';
import type { MedianaOtrasTiendas } from './entrada.js';

export function medianaOtrasTiendas(
  precios: readonly number[],
  p: Parametros = PARAMETROS,
): MedianaOtrasTiendas | null {
  const validos = precios.filter((x) => x > 0).sort((a, b) => a - b);
  if (validos.length < p.minTiendasMediana) return null;
  const medio = validos.length >> 1;
  const precio = validos.length % 2 === 1 ? validos[medio]! : (validos[medio - 1]! + validos[medio]!) / 2;
  return { precio, nTiendas: validos.length };
}
