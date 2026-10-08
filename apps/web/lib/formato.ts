/**
 * Formato de lo que se muestra. Presentacion, no calculo: los ratios y precios de referencia
 * vienen ya calculados de la base (regla de oro 11).
 */

const ARS = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** `$1.200,50`: punto para miles, coma para decimales. */
export function pesos(n: number): string {
  const conDecimales = Number.isInteger(n) ? ARS.format(n) : n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `$${conDecimales}`;
}

/** Un ratio `precio / referencia` como "cuanto menos": 0.45 -> "55%". */
export const porcentajeMenos = (ratio: number): string => `${Math.round((1 - ratio) * 100)}%`;

/** Por ahora el buscador solo anda en Argentina (Rappi .com.ar). Caja holgada del pais. */
export function coordenadasValidas(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -56 && lat <= -21 && lng >= -74 && lng <= -53;
}

/** Argentina es UTC-3 todo el año (sin horario de verano). */
const DIA_ARGENTINO = (t: number) => Math.floor((t - 3 * 3_600_000) / 86_400_000);

/**
 * "Juntando historial, dia N de 7": el dia de la primera corrida es el 1, y se cuentan dias
 * de calendario en Argentina, que es como lo lee una persona (del 8 a la tarde al 10 a la
 * mañana es "el tercer dia", aunque no hayan pasado 48 horas).
 */
export function diaDeHistorial(primeraCorridaOkAt: string, ahora: number): number {
  return DIA_ARGENTINO(ahora) - DIA_ARGENTINO(Date.parse(primeraCorridaOkAt)) + 1;
}

/**
 * Capa 4 del anti-spam, del lado de la pantalla: un producto que dispara dos reglas aparece
 * una vez. La lista ya viene ordenada por ratio, asi que queda la de mas descuento.
 */
export function primeroPorProducto<T extends { productoId: string }>(xs: readonly T[]): T[] {
  const vistos = new Set<string>();
  return xs.filter((x) => !vistos.has(x.productoId) && vistos.add(x.productoId));
}
