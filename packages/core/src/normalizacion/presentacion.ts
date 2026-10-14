/**
 * Parseo de la presentacion de un producto a una cantidad en unidades base. Port de `unit_qty`
 * de turbo/detect.py. Lo usa `nuevo_vs_pasillo` para comparar precio por kilo o por litro.
 *
 * **Solo peso y volumen.** Las "Und" se descartan a proposito: un paquete de 150 servilletas y
 * una pizza son los dos "1 Und" y no son comparables. No agregues unidades al diccionario.
 */

export type Dimension = 'g' | 'ml';

export interface Cantidad {
  readonly dimension: Dimension;
  /** En gramos o mililitros. Siempre > 0. */
  readonly cantidad: number;
}

// Un Map y no un objeto literal: con un objeto, `UNIDADES['constructor']` existiria.
const UNIDADES: ReadonlyMap<string, readonly [Dimension, number]> = new Map([
  ['g', ['g', 1]],
  ['gr', ['g', 1]],
  ['kg', ['g', 1000]],
  ['ml', ['ml', 1]],
  ['cc', ['ml', 1]],
  ['l', ['ml', 1000]],
  ['lt', ['ml', 1000]],
]);

/**
 * Rappi escribe mililitros y gramos con la unidad "L" o "Kg": "1 X 1125 L" es un vino de
 * 1,125 L, "65 Kg" un snack de 65 g. Ningun producto de super trae 50 litros o 50 kilos por
 * unidad (un bidon son 20 L, una bolsa de alimento 21 kg), asi que desde aca se leen como
 * mililitros o gramos. Leidos al pie de la letra, el producto parece 1000 veces mas grande y
 * `nuevo_vs_pasillo` lo marca "100% menos".
 */
const MAX_LITROS_O_KILOS = 50;

/** `"3 X 324 g"`: multiplicador opcional, cantidad con decimal `.` o `,`, unidad. Anclado. */
const PRESENTACION = /^\s*(?:(\d+)\s*[xX]\s*)?(\d+(?:[.,]\d+)?)\s*([a-zA-Z]+)\s*$/;

/** `"1 X 473 mL"` -> `{ ml, 473 }`; `"3 X 324 g"` -> `{ g, 972 }`; `"1 Und"` -> `null`. */
export function parsearPresentacion(texto: string | null | undefined): Cantidad | null {
  const m = PRESENTACION.exec(texto ?? '');
  if (!m) return null;
  const unidad = UNIDADES.get(m[3]!.toLowerCase());
  if (!unidad) return null;
  const [dimension, factor] = unidad;
  const porUnidad = Number(m[2]!.replace(',', '.'));
  const escala = factor === 1000 && porUnidad >= MAX_LITROS_O_KILOS ? 1 : factor;
  const cantidad = Number(m[1] ?? 1) * porUnidad * escala;
  return cantidad > 0 ? { dimension, cantidad } : null;
}
