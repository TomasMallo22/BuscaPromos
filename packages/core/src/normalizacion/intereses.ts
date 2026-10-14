/**
 * Lo que le interesa a cada usuario (spec 005): categorias elegidas y productos escritos a mano.
 * La misma busqueda para el feed y para Telegram: no se reimplementa en otro lado.
 */
import { REGISTRY } from '../reglas/registry.js';
import type { ReglaClave } from '../reglas/tipos.js';

export interface Intereses {
  readonly categorias: readonly string[];
  readonly terminos: readonly string[];
}

/** Sin tildes, en minusculas, solo letras, numeros y espacios. */
export const normalizarTexto = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Las palabras de un termino tal como se buscan: normalizadas, y las de 5 letras o mas sin la
 * ultima ("yogurt" busca "yogur", "aceites" busca "aceite"): la gente no escribe como Rappi.
 */
export const palabrasDeTermino = (termino: string): string[] =>
  normalizarTexto(termino)
    .split(' ')
    .filter(Boolean)
    .map((p) => (p.length >= 5 ? p.slice(0, -1) : p));

/** ¿El producto es lo que el usuario escribio? Cada palabra del termino tiene que estar en el nombre, en cualquier orden. */
export function coincideTermino(nombre: string, termino: string): boolean {
  const palabras = palabrasDeTermino(termino);
  if (palabras.length === 0) return false;
  const texto = normalizarTexto(nombre);
  return palabras.every((p) => texto.includes(p));
}

export function terminoQueCoincide(nombre: string, terminos: readonly string[]): string | null {
  return terminos.find((t) => coincideTermino(nombre, t)) ?? null;
}

/** La categoria esta elegida, o el nombre coincide con algun termino. */
export function interesa(producto: { readonly categoria: string | null; readonly nombre: string }, i: Intereses): boolean {
  return (producto.categoria !== null && i.categorias.includes(producto.categoria)) || terminoQueCoincide(producto.nombre, i.terminos) !== null;
}

/** Un hallazgo se muestra si interesa, o si su regla es extrema (ver `extrema` en el registry). */
export function seMuestra(
  h: { readonly categoria: string | null; readonly nombre: string; readonly regla: ReglaClave },
  i: Intereses,
): boolean {
  return REGISTRY[h.regla].extrema || interesa(h, i);
}
