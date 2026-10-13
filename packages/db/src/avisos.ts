/**
 * Lo que `notificar` lee y escribe (spec 004). Cliente con la clave secreta: corre en Actions.
 *
 * El `chat_id` es un dato personal: se lee para enviar y no se devuelve a ningun log (regla de
 * oro 14).
 */
import type { ReglaClave } from '@buscapromos/core';
import { aEpoch } from './crawler.js';
import type { ClienteServicio } from './servicio.js';

const PAGINA = 1000;
const IDS_POR_PEDIDO = 150;

function* trozos<T>(xs: readonly T[], n: number): Generator<T[]> {
  for (let i = 0; i < xs.length; i += n) yield xs.slice(i, i + n);
}

function fallar(que: string, error: { message: string }): never {
  throw new Error(`${que}: ${error.message}`);
}

export interface Destinatario {
  readonly usuarioId: string;
  readonly chatId: string;
  readonly categorias: readonly string[];
  readonly terminos: readonly string[];
  readonly silencioDesde: number;
  readonly silencioHasta: number;
  readonly maxPorHora: number;
}

/** Los usuarios con Telegram vinculado y al menos una preferencia (es opt-in). */
export async function destinatarios(c: ClienteServicio): Promise<Destinatario[]> {
  const canales = await c.from('canales_notificacion').select('usuario_id, destino').eq('tipo', 'telegram').eq('verificado', true);
  if (canales.error) fallar('canales', canales.error);
  const conChat = canales.data.filter((x): x is { usuario_id: string; destino: string } => Boolean(x.destino));
  if (conChat.length === 0) return [];
  const perfiles = await c
    .from('perfiles')
    .select('id, avisos_categorias, avisos_terminos, hora_silencio_desde, hora_silencio_hasta, max_alertas_hora')
    .in('id', conChat.map((x) => x.usuario_id));
  if (perfiles.error) fallar('perfiles', perfiles.error);
  const porId = new Map(perfiles.data.map((p) => [p.id, p]));
  return conChat.flatMap((x) => {
    const p = porId.get(x.usuario_id);
    if (!p || (p.avisos_categorias.length === 0 && p.avisos_terminos.length === 0)) return [];
    return [
      {
        usuarioId: x.usuario_id,
        chatId: x.destino,
        categorias: p.avisos_categorias,
        terminos: p.avisos_terminos,
        silencioDesde: p.hora_silencio_desde,
        silencioHasta: p.hora_silencio_hasta,
        maxPorHora: p.max_alertas_hora,
      },
    ];
  });
}

/** Las tiendas de cada usuario y desde cuando esta suscripto (capa 5: nada de antes). */
export async function suscripcionesActivas(c: ClienteServicio, usuarioIds: readonly string[]): Promise<Map<string, Map<string, number>>> {
  const out = new Map<string, Map<string, number>>();
  for (const trozo of trozos(usuarioIds, IDS_POR_PEDIDO)) {
    const { data, error } = await c.from('suscripciones').select('usuario_id, tienda_id, creada_at').eq('activa', true).in('usuario_id', trozo);
    if (error) fallar('suscripciones', error);
    for (const s of data) {
      const tiendas = out.get(s.usuario_id) ?? new Map<string, number>();
      const desde = aEpoch(s.creada_at);
      // Dos direcciones en la misma tienda: cuenta la suscripcion mas vieja.
      tiendas.set(s.tienda_id, Math.min(tiendas.get(s.tienda_id) ?? desde, desde));
      out.set(s.usuario_id, tiendas);
    }
  }
  return out;
}

export interface TiendaDelAviso {
  readonly idExterno: string;
  readonly tipo: string;
  readonly nombre: string | null;
}

export interface HallazgoParaAviso {
  readonly hallazgoId: string;
  readonly productoId: string;
  readonly tiendaId: string;
  readonly regla: ReglaClave;
  readonly precio: number;
  readonly precioReferencia: number | null;
  readonly ratio: number | null;
  readonly detectadoAt: number;
  readonly nombre: string;
  readonly presentacion: string | null;
  readonly categoria: string;
  readonly tienda: TiendaDelAviso;
}

/** Hallazgos abiertos y notificables de esas tiendas, desde `desde` (epoch). */
export async function hallazgosNotificables(
  c: ClienteServicio,
  tiendaIds: readonly string[],
  desde: number,
): Promise<HallazgoParaAviso[]> {
  const out: HallazgoParaAviso[] = [];
  for (const trozo of trozos(tiendaIds, IDS_POR_PEDIDO)) {
    for (let d = 0; ; d += PAGINA) {
      const { data, error } = await c
        .from('hallazgos')
        .select(
          'id, producto_id, tienda_id, regla, precio, precio_referencia, ratio, detectado_at, productos(nombre, presentacion, categoria), tiendas(id_externo, tipo, nombre)',
        )
        .in('tienda_id', trozo)
        .is('cerrado_at', null)
        .eq('notificar', true)
        .gte('detectado_at', new Date(desde * 1000).toISOString())
        .order('id')
        .range(d, d + PAGINA - 1);
      if (error) fallar('hallazgos notificables', error);
      for (const h of data) {
        if (!h.productos || !h.tiendas) continue;
        out.push({
          hallazgoId: h.id,
          productoId: h.producto_id,
          tiendaId: h.tienda_id,
          regla: h.regla,
          precio: h.precio,
          precioReferencia: h.precio_referencia,
          ratio: h.ratio,
          detectadoAt: aEpoch(h.detectado_at),
          nombre: h.productos.nombre,
          presentacion: h.productos.presentacion,
          categoria: h.productos.categoria,
          tienda: { idExterno: h.tiendas.id_externo, tipo: h.tiendas.tipo, nombre: h.tiendas.nombre },
        });
      }
      if (data.length < PAGINA) break;
    }
  }
  return out;
}

export interface DescuentoParaAviso {
  readonly productoId: string;
  readonly tiendaId: string;
  readonly precio: number;
  readonly precioLista: number;
  readonly nombre: string;
  readonly presentacion: string | null;
  readonly tienda: TiendaDelAviso;
}

/** Descuentos anunciados de `ratioMaximo` o menos, en stock, de esas tiendas. */
export async function descuentosNotificables(
  c: ClienteServicio,
  tiendaIds: readonly string[],
  ratioMaximo: number,
): Promise<DescuentoParaAviso[]> {
  const out: DescuentoParaAviso[] = [];
  for (const trozo of trozos(tiendaIds, IDS_POR_PEDIDO)) {
    for (let d = 0; ; d += PAGINA) {
      const { data, error } = await c
        .from('precios_actuales')
        .select('producto_id, tienda_id, precio, precio_lista, productos(nombre, presentacion), tiendas(id_externo, tipo, nombre)')
        .in('tienda_id', trozo)
        .eq('en_stock', true)
        .eq('promo_kind', 'descuento_lista')
        .lte('ratio_lista', ratioMaximo)
        .order('producto_id')
        .range(d, d + PAGINA - 1);
      if (error) fallar('descuentos notificables', error);
      for (const p of data) {
        if (!p.productos || !p.tiendas || p.precio_lista === null) continue;
        out.push({
          productoId: p.producto_id,
          tiendaId: p.tienda_id,
          precio: p.precio,
          precioLista: p.precio_lista,
          nombre: p.productos.nombre,
          presentacion: p.productos.presentacion,
          tienda: { idExterno: p.tiendas.id_externo, tipo: p.tiendas.tipo, nombre: p.tiendas.nombre },
        });
      }
      if (data.length < PAGINA) break;
    }
  }
  return out;
}

/** Lo ya registrado para un usuario: hallazgos (por id) y descuentos (por tienda|producto, con el precio avisado). */
export async function yaRegistrado(c: ClienteServicio, usuarioId: string) {
  const n = await c.from('notificaciones').select('hallazgo_id').eq('usuario_id', usuarioId).eq('canal', 'telegram');
  if (n.error) fallar('notificaciones registradas', n.error);
  const a = await c.from('avisos_descuento').select('tienda_id, producto_id, precio_avisado').eq('usuario_id', usuarioId);
  if (a.error) fallar('avisos de descuento registrados', a.error);
  return {
    hallazgos: new Set(n.data.map((x) => x.hallazgo_id)),
    descuentos: new Map(a.data.map((x) => [`${x.tienda_id}|${x.producto_id}`, x.precio_avisado])),
  };
}

/**
 * Primero se registra, despues se envia (skill alertas-telegram). Idempotente: correr dos
 * veces no duplica (`on conflict do nothing` / upsert por clave).
 */
export async function registrarAvisos(
  c: ClienteServicio,
  usuarioId: string,
  hallazgoIds: readonly string[],
  descuentos: ReadonlyArray<{ tiendaId: string; productoId: string; precio: number; precioLista: number; termino: string }>,
): Promise<void> {
  if (hallazgoIds.length > 0) {
    const { error } = await c
      .from('notificaciones')
      .upsert(
        hallazgoIds.map((h) => ({ hallazgo_id: h, usuario_id: usuarioId, canal: 'telegram' as const })),
        { onConflict: 'hallazgo_id,usuario_id,canal', ignoreDuplicates: true },
      );
    if (error) fallar('registrar notificaciones', error);
  }
  if (descuentos.length > 0) {
    const ahora = new Date().toISOString();
    const { error } = await c.from('avisos_descuento').upsert(
      descuentos.map((d) => ({
        usuario_id: usuarioId,
        tienda_id: d.tiendaId,
        producto_id: d.productoId,
        precio_avisado: d.precio,
        precio_lista: d.precioLista,
        termino: d.termino,
        creado_at: ahora,
        enviada_at: null,
        error: null,
      })),
      { onConflict: 'usuario_id,tienda_id,producto_id' },
    );
    if (error) fallar('registrar avisos de descuento', error);
  }
}

export type AvisoPendiente =
  | { readonly tipo: 'hallazgo'; readonly clave: string; readonly creadoAt: number; readonly hallazgo: HallazgoParaAviso; readonly notificacionId: number }
  | {
      readonly tipo: 'descuento';
      readonly clave: string;
      readonly creadoAt: number;
      readonly descuento: DescuentoParaAviso;
      readonly termino: string;
    };

const VENCIDO = 'vencido';

/** Lo registrado y no enviado (ni vencido) de un usuario, con lo necesario para armar el mensaje. */
export async function pendientes(c: ClienteServicio, usuarioId: string): Promise<AvisoPendiente[]> {
  const n = await c
    .from('notificaciones')
    .select(
      'id, creada_at, hallazgos!inner(id, producto_id, tienda_id, regla, precio, precio_referencia, ratio, detectado_at, cerrado_at, productos(nombre, presentacion, categoria), tiendas(id_externo, tipo, nombre))',
    )
    .eq('usuario_id', usuarioId)
    .eq('canal', 'telegram')
    .is('enviada_at', null)
    .or(`error.is.null,error.neq.${VENCIDO}`)
    .is('hallazgos.cerrado_at', null);
  if (n.error) fallar('notificaciones pendientes', n.error);
  const a = await c
    .from('avisos_descuento')
    .select('tienda_id, producto_id, precio_avisado, precio_lista, termino, creado_at, productos(nombre, presentacion), tiendas(id_externo, tipo, nombre)')
    .eq('usuario_id', usuarioId)
    .is('enviada_at', null)
    .or(`error.is.null,error.neq.${VENCIDO}`);
  if (a.error) fallar('avisos de descuento pendientes', a.error);

  const out: AvisoPendiente[] = [];
  for (const x of n.data) {
    const h = x.hallazgos;
    if (!h.productos || !h.tiendas) continue;
    out.push({
      tipo: 'hallazgo',
      clave: `n:${x.id}`,
      notificacionId: x.id,
      creadoAt: aEpoch(x.creada_at),
      hallazgo: {
        hallazgoId: h.id,
        productoId: h.producto_id,
        tiendaId: h.tienda_id,
        regla: h.regla,
        precio: h.precio,
        precioReferencia: h.precio_referencia,
        ratio: h.ratio,
        detectadoAt: aEpoch(h.detectado_at),
        nombre: h.productos.nombre,
        presentacion: h.productos.presentacion,
        categoria: h.productos.categoria,
        tienda: { idExterno: h.tiendas.id_externo, tipo: h.tiendas.tipo, nombre: h.tiendas.nombre },
      },
    });
  }
  for (const x of a.data) {
    if (!x.productos || !x.tiendas) continue;
    out.push({
      tipo: 'descuento',
      clave: `d:${x.tienda_id}|${x.producto_id}`,
      creadoAt: aEpoch(x.creado_at),
      termino: x.termino,
      descuento: {
        productoId: x.producto_id,
        tiendaId: x.tienda_id,
        precio: x.precio_avisado,
        precioLista: x.precio_lista,
        nombre: x.productos.nombre,
        presentacion: x.productos.presentacion,
        tienda: { idExterno: x.tiendas.id_externo, tipo: x.tiendas.tipo, nombre: x.tiendas.nombre },
      },
    });
  }
  return out;
}

/** Cuantos avisos salieron en la ultima hora (para el tope por hora). */
export async function enviadosUltimaHora(c: ClienteServicio, usuarioId: string): Promise<number> {
  const hace = new Date(Date.now() - 3600_000).toISOString();
  const n = await c.from('notificaciones').select('id', { count: 'exact', head: true }).eq('usuario_id', usuarioId).gte('enviada_at', hace);
  const a = await c.from('avisos_descuento').select('producto_id', { count: 'exact', head: true }).eq('usuario_id', usuarioId).gte('enviada_at', hace);
  if (n.error) fallar('enviados (notificaciones)', n.error);
  if (a.error) fallar('enviados (descuentos)', a.error);
  return (n.count ?? 0) + (a.count ?? 0);
}

/** `null` = enviado; un texto = el error (o `vencido`). */
export async function marcarAviso(c: ClienteServicio, usuarioId: string, aviso: AvisoPendiente, resultado: string | null): Promise<void> {
  const cambios = resultado === null ? { enviada_at: new Date().toISOString(), error: null } : { error: resultado.slice(0, 300) };
  const { error } =
    aviso.tipo === 'hallazgo'
      ? await c.from('notificaciones').update(cambios).eq('id', aviso.notificacionId)
      : await c
          .from('avisos_descuento')
          .update(cambios)
          .eq('usuario_id', usuarioId)
          .eq('tienda_id', aviso.descuento.tiendaId)
          .eq('producto_id', aviso.descuento.productoId);
  if (error) fallar('marcar aviso', error);
}

export const AVISO_VENCIDO = VENCIDO;
