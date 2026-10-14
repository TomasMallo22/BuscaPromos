/**
 * Lo que la web lee para el feed y las direcciones. Siempre con el cliente de la sesion del
 * usuario: RLS decide que tiendas, hallazgos y precios ve (regla de oro 13). Ninguna funcion
 * filtra por usuario a mano.
 */
import { interesa, palabrasDeTermino, seMuestra, type Intereses, type ReglaClave } from '@buscapromos/core';
import type { ClienteUsuario } from './usuarios.js';

export interface DireccionDelUsuario {
  readonly id: string;
  readonly etiqueta: string;
  readonly estado: 'buscando_tienda' | 'resuelta' | 'sin_cobertura';
  readonly creadaAt: string;
}

export async function misDirecciones(c: ClienteUsuario): Promise<DireccionDelUsuario[]> {
  // Sin lat/lng: la pantalla no los necesita y no tienen por que viajar.
  const { data, error } = await c
    .from('direcciones')
    .select('id, etiqueta, resuelta_at, sin_cobertura_at, creada_at')
    .eq('activa', true)
    .order('creada_at');
  if (error) throw new Error(`No se pudieron leer tus direcciones: ${error.message}`);
  return data.map((d) => ({
    id: d.id,
    etiqueta: d.etiqueta,
    estado: d.sin_cobertura_at ? 'sin_cobertura' : d.resuelta_at ? 'resuelta' : 'buscando_tienda',
    creadaAt: d.creada_at,
  }));
}

export interface TiendaDelUsuario {
  readonly id: string;
  readonly tipo: string;
  readonly idExterno: string;
  readonly nombre: string | null;
  readonly primeraCorridaOkAt: string | null;
  readonly ultimaCorridaOkAt: string | null;
}

/** Las tiendas a las que esta suscripto. Columnas explicitas: las coordenadas no tienen grant. */
export async function misTiendas(c: ClienteUsuario): Promise<TiendaDelUsuario[]> {
  const { data, error } = await c
    .from('tiendas')
    .select('id, tipo, id_externo, nombre, primera_corrida_ok_at, ultima_corrida_ok_at');
  if (error) throw new Error(`No se pudieron leer tus tiendas: ${error.message}`);
  return data.map((t) => ({
    id: t.id,
    tipo: t.tipo,
    idExterno: t.id_externo,
    nombre: t.nombre,
    primeraCorridaOkAt: t.primera_corrida_ok_at,
    ultimaCorridaOkAt: t.ultima_corrida_ok_at,
  }));
}

export interface ProductoEnFeed {
  readonly nombre: string;
  readonly presentacion: string | null;
  readonly imagenUrl: string | null;
  readonly tienda: { readonly idExterno: string; readonly tipo: string; readonly nombre: string | null };
}

export interface HallazgoEnFeed extends ProductoEnFeed {
  readonly id: string;
  readonly productoId: string;
  readonly regla: ReglaClave;
  readonly precio: number;
  readonly precioReferencia: number | null;
  readonly ratio: number | null;
  readonly estadoOferta: 'real' | 'inflado' | 'sin_historial' | null;
  readonly detectadoAt: string;
  readonly categoria: string | null;
}

/**
 * Lo que el usuario eligio mirar: una categoria comun y/o un texto en el nombre (spec 003), o
 * sus intereses (spec 005): lo que interesa y, de los hallazgos, tambien lo extremo.
 */
export interface FiltroFeed {
  readonly categoria?: string | null;
  readonly texto?: string | null;
  readonly intereses?: Intereses | null;
}

/**
 * Los intereses como `or` de PostgREST sobre `productos`: la categoria elegida, o todas las
 * palabras de algun termino. Es un prefiltro: lo que trae se refina con `interesa` del core.
 * Las vocales van como `_` (cualquier letra) para que "azucar" encuentre "Azúcar"; las palabras
 * de 1 o 2 letras, tal cual. Las palabras ya vienen normalizadas: solo letras y numeros, nada que
 * rompa la sintaxis del `or`. `null` si no hay nada que filtrar.
 */
export function filtroIntereses(i: Intereses): string | null {
  const partes: string[] = [];
  if (i.categorias.length > 0) partes.push(`categoria.in.(${i.categorias.join(',')})`);
  for (const termino of i.terminos) {
    const ilikes = palabrasDeTermino(termino).map(
      (p) => `nombre.ilike.*${p.length <= 2 ? p : p.replace(/[aeiou]/g, '_')}*`,
    );
    if (ilikes.length === 1) partes.push(ilikes[0]!);
    else if (ilikes.length > 1) partes.push(`and(${ilikes.join(',')})`);
  }
  return partes.length > 0 ? partes.join(',') : null;
}

/** Cuantos de mas se leen cuando despues se refina en TS: el prefiltro trae algo de ruido. */
const MARGEN_REFINADO = 4;

/** Un texto del usuario dentro de un `ilike`: `%` y `_` son comodines, se escapan. */
export const patronIlike = (texto: string) => `%${texto.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

/** Los hallazgos abiertos, ya calculados por el crawler. Ordenados por ratio: mas descuento primero. */
export async function hallazgosVigentes(c: ClienteUsuario, filtro: FiltroFeed = {}, limite = 100): Promise<HallazgoEnFeed[]> {
  let q = c
    .from('hallazgos')
    .select(
      'id, producto_id, regla, precio, precio_referencia, ratio, estado_oferta, detectado_at, productos!inner(nombre, presentacion, imagen_url, categoria), tiendas(id_externo, tipo, nombre)',
    )
    .is('cerrado_at', null);
  if (filtro.categoria) q = q.eq('productos.categoria', filtro.categoria);
  if (filtro.texto) q = q.ilike('productos.nombre', patronIlike(filtro.texto));
  // Con intereses no hay prefiltro en la base: lo extremo pasa sea lo que sea. Abiertos hay
  // cientos, no miles.
  const { intereses } = filtro;
  const { data, error } = await q
    .order('ratio', { ascending: true, nullsFirst: false })
    .limit(intereses ? limite * MARGEN_REFINADO : limite);
  if (error) throw new Error(`No se pudieron leer los hallazgos: ${error.message}`);
  const todos: HallazgoEnFeed[] = data.flatMap((h) =>
    h.productos && h.tiendas
      ? [
          {
            id: h.id,
            productoId: h.producto_id,
            regla: h.regla,
            precio: h.precio,
            precioReferencia: h.precio_referencia,
            ratio: h.ratio,
            estadoOferta: h.estado_oferta,
            detectadoAt: h.detectado_at,
            categoria: h.productos.categoria,
            nombre: h.productos.nombre,
            presentacion: h.productos.presentacion,
            imagenUrl: h.productos.imagen_url,
            tienda: { idExterno: h.tiendas.id_externo, tipo: h.tiendas.tipo, nombre: h.tiendas.nombre },
          },
        ]
      : [],
  );
  return intereses ? todos.filter((h) => seMuestra(h, intereses)).slice(0, limite) : todos;
}

export interface DescuentoAnunciado extends ProductoEnFeed {
  readonly productoId: string;
  readonly precio: number;
  readonly precioLista: number;
  readonly ratioLista: number;
  readonly categoria: string | null;
}

/**
 * Los mayores descuentos que ANUNCIA el proveedor (el precio tachado). No es una deteccion:
 * la web los muestra marcados "segun Rappi, sin verificar" (decision del dueño, 2026-10-08).
 */
export async function descuentosAnunciados(c: ClienteUsuario, filtro: FiltroFeed = {}, limite = 30): Promise<DescuentoAnunciado[]> {
  let q = c
    .from('precios_actuales')
    .select(
      'producto_id, precio, precio_lista, ratio_lista, productos!inner(nombre, presentacion, imagen_url, categoria), tiendas(id_externo, tipo, nombre)',
    )
    .eq('en_stock', true)
    .eq('promo_kind', 'descuento_lista')
    .not('ratio_lista', 'is', null);
  if (filtro.categoria) q = q.eq('productos.categoria', filtro.categoria);
  if (filtro.texto) q = q.ilike('productos.nombre', patronIlike(filtro.texto));
  // Los descuentos anunciados nunca son extremos (regla de oro 1): solo lo que interesa.
  const { intereses } = filtro;
  const prefiltro = intereses ? filtroIntereses(intereses) : null;
  if (intereses && !prefiltro) return [];
  if (prefiltro) q = q.or(prefiltro, { referencedTable: 'productos' });
  const { data, error } = await q.order('ratio_lista', { ascending: true }).limit(intereses ? limite * MARGEN_REFINADO : limite);
  if (error) throw new Error(`No se pudieron leer los descuentos: ${error.message}`);
  const todos: DescuentoAnunciado[] = data.flatMap((p) =>
    p.productos && p.tiendas && p.precio_lista !== null && p.ratio_lista !== null
      ? [
          {
            productoId: p.producto_id,
            precio: p.precio,
            precioLista: p.precio_lista,
            ratioLista: p.ratio_lista,
            categoria: p.productos.categoria,
            nombre: p.productos.nombre,
            presentacion: p.productos.presentacion,
            imagenUrl: p.productos.imagen_url,
            tienda: { idExterno: p.tiendas.id_externo, tipo: p.tiendas.tipo, nombre: p.tiendas.nombre },
          },
        ]
      : [],
  );
  return intereses ? todos.filter((d) => interesa(d, intereses)).slice(0, limite) : todos;
}

export type ResultadoNuevaDireccion = { ok: true } | { ok: false; motivo: 'etiqueta_repetida' | 'otro' };

/** DATOS PERSONALES: lat/lng de la casa de alguien (regla de oro 14). */
export async function crearDireccion(
  c: ClienteUsuario,
  usuarioId: string,
  d: { etiqueta: string; texto: string; lat: number; lng: number },
): Promise<ResultadoNuevaDireccion> {
  const { error } = await c.from('direcciones').insert({ usuario_id: usuarioId, ...d });
  if (!error) return { ok: true };
  // unique (usuario_id, etiqueta): ya tiene una "Casa".
  return { ok: false, motivo: error.code === '23505' ? 'etiqueta_repetida' : 'otro' };
}

/** Una direccion propia, con sus coordenadas, para editarla. RLS: solo la del usuario. */
export async function obtenerDireccion(
  c: ClienteUsuario,
  id: string,
): Promise<{ id: string; etiqueta: string; texto: string; lat: number; lng: number } | null> {
  const { data, error } = await c.from('direcciones').select('id, etiqueta, texto, lat, lng').eq('id', id).maybeSingle();
  if (error) throw new Error(`No se pudo leer la direccion: ${error.message}`);
  return data;
}

/**
 * Edita nombre, referencia y ubicacion. Si la ubicacion cambia, el trigger de la 0016 borra sus
 * tiendas y la vuelve a pendiente. Devuelve si se movio, para disparar el buscador.
 */
export async function actualizarDireccion(
  c: ClienteUsuario,
  id: string,
  d: { etiqueta: string; texto: string; lat: number; lng: number },
): Promise<{ ok: true; movida: boolean } | { ok: false; motivo: 'etiqueta_repetida' | 'otro' }> {
  const antes = await obtenerDireccion(c, id);
  if (!antes) return { ok: false, motivo: 'otro' };
  const { error } = await c.from('direcciones').update(d).eq('id', id);
  if (error) return { ok: false, motivo: error.code === '23505' ? 'etiqueta_repetida' : 'otro' };
  return { ok: true, movida: antes.lat !== d.lat || antes.lng !== d.lng };
}

/** Borra la direccion; sus suscripciones se van con ella (0016, `on delete cascade`). */
export async function borrarDireccion(c: ClienteUsuario, id: string): Promise<boolean> {
  const { error, count } = await c.from('direcciones').delete({ count: 'exact' }).eq('id', id);
  return !error && count === 1;
}
