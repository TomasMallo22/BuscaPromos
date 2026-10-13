/**
 * El texto de cada aviso de Telegram (HTML de Telegram). Titulos y emoji salen del registry
 * (regla de oro 10); el precio, del formato del core, el mismo que ve la web.
 */
import { pesos, porcentajeMenos, REGISTRY, type ReglaClave } from '@buscapromos/core';
import { urlProductoRappi } from '@buscapromos/providers/rappi-url';

interface Tienda {
  readonly idExterno: string;
  readonly tipo: string;
  readonly nombre: string | null;
}

/** El nombre del producto lo escribio Rappi: en HTML de Telegram, `<`, `>` y `&` se escapan. */
const html = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const producto = (nombre: string, presentacion: string | null) => html(presentacion ? `${nombre} · ${presentacion}` : nombre);
const link = (nombre: string, t: Tienda) => `<a href="${html(urlProductoRappi(nombre, t.idExterno, t.tipo))}">Ver en Rappi</a>`;
const tiendaDe = (t: Tienda) => html(t.nombre ?? t.tipo);

export function mensajeHallazgo(h: {
  regla: ReglaClave;
  nombre: string;
  presentacion: string | null;
  precio: number;
  precioReferencia: number | null;
  ratio: number | null;
  tienda: Tienda;
}): string {
  const regla = REGISTRY[h.regla];
  const referencia =
    h.precioReferencia !== null && h.ratio !== null ? ` (antes ${pesos(h.precioReferencia)}, ${porcentajeMenos(h.ratio)} menos)` : '';
  return [
    `${regla.emoji} <b>${html(regla.titulo)}</b>`,
    producto(h.nombre, h.presentacion),
    `<b>${pesos(h.precio)}</b> en ${tiendaDe(h.tienda)}${referencia}`,
    link(h.nombre, h.tienda),
  ].join('\n');
}

export function mensajeDescuento(d: {
  nombre: string;
  presentacion: string | null;
  precio: number;
  precioLista: number;
  tienda: Tienda;
  termino: string;
}): string {
  return [
    '🏷️ <b>Descuento que anuncia Rappi</b> (sin verificar)',
    producto(d.nombre, d.presentacion),
    `<b>${pesos(d.precio)}</b> en ${tiendaDe(d.tienda)} (tachado ${pesos(d.precioLista)}, ${porcentajeMenos(d.precio / d.precioLista)} menos)`,
    `Por tu búsqueda “${html(d.termino)}”. ${link(d.nombre, d.tienda)}`,
  ].join('\n');
}
