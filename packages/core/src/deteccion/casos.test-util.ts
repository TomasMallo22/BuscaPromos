/**
 * Carga los casos sinteticos de `fixtures/rappi/casos/` para los tests del motor.
 *
 * Los valores esperados de esos JSON estan validados contra la implementacion original en
 * Python (`scripts/validar-casos-contra-original.py`). Los tests los leen del archivo en vez de
 * copiarlos, asi los dos lados comparan contra la misma verdad.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FilaPrecio } from '../tipos.js';

export const DIA = 86400;
/** Base arbitraria, la misma que usa el validador en Python. El reloj es inyectado. */
export const AHORA = 1000 * DIA;

const CASOS = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../fixtures/rappi/casos');

export interface FilaCaso {
  readonly diasAtras: number;
  readonly precio: number;
  readonly promoExcluida: boolean;
  readonly enStock: boolean;
}

export function cargarCaso<T>(nombre: string): T {
  return JSON.parse(readFileSync(resolve(CASOS, `${nombre}.json`), 'utf8')) as T;
}

/** `diasAtras` -> epoch en segundos, como hace el validador en Python. */
export function aFilas(filas: readonly FilaCaso[], ahora = AHORA): FilaPrecio[] {
  return filas.map((f) => ({
    ts: ahora - f.diasAtras * DIA,
    precio: f.precio,
    promoExcluida: f.promoExcluida,
    enStock: f.enStock,
  }));
}

/** Una fila en stock y sin promo, a `diasAtras` de `AHORA`. */
export const fila = (diasAtras: number, precio: number, extra: Partial<FilaPrecio> = {}): FilaPrecio => ({
  ts: AHORA - diasAtras * DIA,
  precio,
  promoExcluida: false,
  enStock: true,
  ...extra,
});
