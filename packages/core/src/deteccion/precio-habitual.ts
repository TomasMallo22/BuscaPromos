/**
 * El precio habitual: la moda ponderada por duracion (regla de oro 3). Port de
 * `typical_from_changes` de turbo/db.py. Ver docs/03-motor-deteccion.md seccion 1.
 *
 * Funcion pura: sin red, sin DB, con el reloj inyectado.
 */
import type { FilaPrecio } from '../tipos.js';

const DIA = 86400;

/**
 * Cuantos segundos estuvo vigente cada precio dentro de la ventana de `dias` que termina en
 * `ahora`. El `Map` conserva el orden de insercion: el primer precio es el mas viejo.
 *
 * `filas` son los cambios de precio en orden cronologico; **el ultimo es el estado actual y no
 * cuenta**. Tampoco cuentan los tramos sin stock ni los de promo excluida: ese precio no estaba
 * realmente a la venta para el usuario.
 */
export function duracionesPorPrecio(
  filas: readonly FilaPrecio[],
  dias: number,
  ahora: number,
): Map<number, number> {
  const desde = ahora - dias * DIA;
  const sostenido = new Map<number, number>();
  // Pares (fila, siguiente): la ultima fila no tiene siguiente y queda afuera A PROPOSITO.
  // Si el precio de hoy entrara, contaminaria la referencia contra la que se lo compara.
  for (let i = 0; i < filas.length - 1; i++) {
    const fila = filas[i]!;
    const siguiente = filas[i + 1]!;
    if (fila.promoExcluida || !fila.enStock) continue;
    const inicio = Math.max(fila.ts, desde);
    if (siguiente.ts > inicio) {
      sostenido.set(fila.precio, (sostenido.get(fila.precio) ?? 0) + (siguiente.ts - inicio));
    }
  }
  return sostenido;
}

/** El precio que mas tiempo estuvo vigente en la ventana, o `null` si no hay ninguno. */
export function precioHabitual(filas: readonly FilaPrecio[], dias: number, ahora: number): number | null {
  let mejor: number | null = null;
  let mejorDuracion = -Infinity;
  // `>` ESTRICTO, nunca `>=`: en empate gana el precio mas viejo, como `max(held, key=held.get)`
  // en Python sobre un dict con orden de insercion. Con `>=` gana el mas nuevo.
  for (const [precio, duracion] of duracionesPorPrecio(filas, dias, ahora)) {
    if (duracion > mejorDuracion) {
      mejor = precio;
      mejorDuracion = duracion;
    }
  }
  return mejor;
}
