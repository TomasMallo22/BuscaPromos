/**
 * Lo que el usuario elige para sus avisos (spec 004), validado: llega de un formulario que
 * cualquiera puede armar a mano.
 */
import { CATEGORIAS } from '@buscapromos/core';

const MAX_TERMINOS = 30; // el mismo tope que el check de `perfiles.avisos_terminos` (0019)
const LARGO_MAXIMO = 40;

/** "aceite de oliva\nyogurt natural, yerba" -> ['aceite de oliva', 'yogurt natural', 'yerba']. */
export function parsearTerminos(texto: string): string[] {
  const vistos = new Set<string>();
  const out: string[] = [];
  for (const crudo of texto.split(/[\n,]/)) {
    const t = crudo.replace(/\s+/g, ' ').trim().slice(0, LARGO_MAXIMO);
    if (t.length < 2 || vistos.has(t.toLowerCase())) continue;
    vistos.add(t.toLowerCase());
    out.push(t);
    if (out.length === MAX_TERMINOS) break;
  }
  return out;
}

export function categoriasValidas(elegidas: readonly string[]): string[] {
  const existentes = new Set<string>(CATEGORIAS.map((c) => c.clave));
  return [...new Set(elegidas)].filter((c) => existentes.has(c));
}
