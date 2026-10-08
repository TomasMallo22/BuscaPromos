/**
 * Lo que el crawler lee y escribe. Recibe el cliente con la clave secreta (`./servicio.ts`):
 * corre en Actions y nunca en la web.
 *
 * La conversion de tiempo vive aca y en ningun otro lado: la base usa `timestamptz`, el core
 * usa epoch en segundos.
 */
import type { PromoKind, ReglaClave } from '@buscapromos/core';
import type { ClienteServicio } from './servicio.js';
import type { Json, Tables } from './tipos.js';

/** timestamptz -> epoch en segundos. */
export const aEpoch = (ts: string): number => Math.floor(new Date(ts).getTime() / 1000);
/** epoch en segundos -> timestamptz. */
export const aTimestamp = (epoch: number): string => new Date(epoch * 1000).toISOString();

const LOTE = 500;
/** PostgREST corta en 1000 filas por request: todo lo que puede ser mas grande se pagina. */
const PAGINA = 1000;
/** Cuantos ids entran en un `in (...)` sin pasarse del largo de URL. */
const IDS_POR_PEDIDO = 150;

function* trozos<T>(xs: readonly T[], n: number): Generator<T[]> {
  for (let i = 0; i < xs.length; i += n) yield xs.slice(i, i + n);
}

function fallar(que: string, error: { message: string }): never {
  throw new Error(`${que}: ${error.message}`);
}

async function paginado<T>(
  que: string,
  pedir: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const todo: T[] = [];
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await pedir(desde, desde + PAGINA - 1);
    if (error) fallar(que, error);
    todo.push(...(data ?? []));
    if (!data || data.length < PAGINA) return todo;
  }
}

// ---------------------------------------------------------------------------
// Direcciones y tiendas
// ---------------------------------------------------------------------------

/** DATOS PERSONALES: lat/lng de la casa de alguien. Nunca a un log (regla de oro 14). */
export interface DireccionPendiente {
  readonly id: string;
  readonly usuarioId: string;
  readonly lat: number;
  readonly lng: number;
  readonly creadaAt: number;
}

export async function direccionesPendientes(c: ClienteServicio): Promise<DireccionPendiente[]> {
  const { data, error } = await c
    .from('direcciones')
    .select('id, usuario_id, lat, lng, creada_at')
    .eq('activa', true)
    .is('resuelta_at', null)
    .is('sin_cobertura_at', null)
    .order('creada_at');
  if (error) fallar('direcciones pendientes', error);
  return data.map((d) => ({ id: d.id, usuarioId: d.usuario_id, lat: d.lat, lng: d.lng, creadaAt: aEpoch(d.creada_at) }));
}

export interface TiendaParaRegistrar {
  readonly proveedorId: string;
  readonly idExterno: string;
  readonly nombre: string | null;
  readonly consulta: { readonly lat: number; readonly lng: number };
}

/**
 * La direccion encontro tienda: se crea la tienda si no existia (la comparten todos los que
 * caen en ella, E22), se vincula, y el usuario queda suscripto.
 */
export async function registrarTiendaResuelta(
  c: ClienteServicio,
  direccion: DireccionPendiente,
  tienda: TiendaParaRegistrar,
): Promise<string> {
  const existente = await c
    .from('tiendas')
    .select('id')
    .eq('proveedor_id', tienda.proveedorId)
    .eq('id_externo', tienda.idExterno)
    .maybeSingle();
  if (existente.error) fallar('buscar tienda', existente.error);
  let tiendaId = existente.data?.id;
  if (!tiendaId) {
    const nueva = await c
      .from('tiendas')
      .insert({
        proveedor_id: tienda.proveedorId,
        id_externo: tienda.idExterno,
        nombre: tienda.nombre,
        lat_consulta: tienda.consulta.lat,
        lng_consulta: tienda.consulta.lng,
      })
      .select('id')
      .single();
    if (nueva.error) fallar('crear tienda', nueva.error);
    tiendaId = nueva.data.id;
  }

  const vinculo = await c
    .from('direcciones_tiendas')
    .upsert({ direccion_id: direccion.id, tienda_id: tiendaId }, { onConflict: 'direccion_id,tienda_id' });
  if (vinculo.error) fallar('vincular direccion y tienda', vinculo.error);

  const suscripcion = await c
    .from('suscripciones')
    .upsert(
      { usuario_id: direccion.usuarioId, tienda_id: tiendaId, direccion_id: direccion.id, activa: true },
      { onConflict: 'usuario_id,tienda_id' },
    );
  if (suscripcion.error) fallar('suscribir', suscripcion.error);

  const resuelta = await c.from('direcciones').update({ resuelta_at: new Date().toISOString() }).eq('id', direccion.id);
  if (resuelta.error) fallar('marcar direccion resuelta', resuelta.error);
  return tiendaId;
}

export async function marcarSinCobertura(c: ClienteServicio, direccionId: string): Promise<void> {
  const { error } = await c.from('direcciones').update({ sin_cobertura_at: new Date().toISOString() }).eq('id', direccionId);
  if (error) fallar('marcar sin cobertura', error);
}

export interface TiendaActiva {
  readonly id: string;
  readonly proveedorId: string;
  readonly idExterno: string;
  readonly nombre: string | null;
  readonly consulta: { readonly lat: number; readonly lng: number };
  readonly primeraCorridaOk: boolean;
}

/**
 * Las tiendas con al menos una suscripcion activa: la entrada del crawler, que no sabe que
 * existen usuarios. Primero las que nunca se recorrieron: es alguien esperando en el feed.
 */
export async function tiendasActivas(c: ClienteServicio): Promise<TiendaActiva[]> {
  const { data, error } = await c
    .from('tiendas')
    .select('id, proveedor_id, id_externo, nombre, lat_consulta, lng_consulta, primera_corrida_ok_at, suscripciones!inner(activa)')
    .eq('suscripciones.activa', true);
  if (error) fallar('tiendas activas', error);
  return data
    .map((t) => ({
      id: t.id,
      proveedorId: t.proveedor_id,
      idExterno: t.id_externo,
      nombre: t.nombre,
      consulta: { lat: t.lat_consulta, lng: t.lng_consulta },
      primeraCorridaOk: t.primera_corrida_ok_at !== null,
    }))
    .sort((a, b) => Number(a.primeraCorridaOk) - Number(b.primeraCorridaOk));
}

// ---------------------------------------------------------------------------
// Credenciales del proveedor
// ---------------------------------------------------------------------------

export async function leerCredencial(c: ClienteServicio, proveedorId: string) {
  const { data, error } = await c
    .from('credenciales_proveedor')
    .select('token, expira_at')
    .eq('proveedor_id', proveedorId)
    .maybeSingle();
  if (error) fallar('leer credencial', error);
  return data ? { token: data.token, expiraAt: new Date(data.expira_at) } : null;
}

export async function guardarCredencial(c: ClienteServicio, proveedorId: string, token: string, expiraAt: Date) {
  const { error } = await c.from('credenciales_proveedor').upsert({
    proveedor_id: proveedorId,
    token,
    expira_at: expiraAt.toISOString(),
    actualizado_at: new Date().toISOString(),
  });
  if (error) fallar('guardar credencial', error);
}

// ---------------------------------------------------------------------------
// Corridas
// ---------------------------------------------------------------------------

export async function iniciarCorrida(
  c: ClienteServicio,
  tiendaId: string,
  extra: { appVersion: string | null; commitSha: string | null },
): Promise<string> {
  const { data, error } = await c
    .from('corridas')
    .insert({ tienda_id: tiendaId, app_version: extra.appVersion, commit_sha: extra.commitSha })
    .select('id')
    .single();
  if (error) fallar('iniciar corrida', error);
  return data.id;
}

export async function cerrarCorrida(
  c: ClienteServicio,
  corridaId: string,
  resultado: Pick<
    Tables<'corridas'>,
    | 'estado'
    | 'productos_vistos'
    | 'productos_conocidos'
    | 'productos_cambiados'
    | 'hallazgos_nuevos'
    | 'grupos_fallidos'
    | 'descartada_motivo'
  >,
): Promise<void> {
  const { error } = await c
    .from('corridas')
    .update({ ...resultado, fin: new Date().toISOString() })
    .eq('id', corridaId);
  if (error) fallar('cerrar corrida', error);
}

/** Lo que la web lee para "buscando por primera vez" y "juntando historial, dia N de 7". */
export async function marcarCorridaOk(c: ClienteServicio, tiendaId: string, primera: boolean): Promise<void> {
  const ahora = new Date().toISOString();
  const { error } = await c
    .from('tiendas')
    .update(primera ? { primera_corrida_ok_at: ahora, ultima_corrida_ok_at: ahora } : { ultima_corrida_ok_at: ahora })
    .eq('id', tiendaId);
  if (error) fallar('marcar corrida ok', error);
}

// ---------------------------------------------------------------------------
// Catalogo y precios
// ---------------------------------------------------------------------------

export interface ProductoParaGuardar {
  readonly idExterno: string;
  readonly nombre: string;
  readonly marca: string | null;
  readonly presentacion: string | null;
  readonly imagenUrl: string | null;
  readonly categoriaPath: readonly string[];
  readonly canonica: { readonly clave: string; readonly origen: 'ean' | 'rappi_master' | 'nombre_marca_presentacion' } | null;
}

/** Upsert del catalogo. Devuelve `idExterno -> productos.id`. */
export async function guardarProductos(
  c: ClienteServicio,
  proveedorId: string,
  productos: readonly ProductoParaGuardar[],
): Promise<Map<string, string>> {
  const canonicos = new Map<string, string>();
  const claves = [...new Map(productos.flatMap((p) => (p.canonica ? [[p.canonica.clave, p.canonica] as const] : []))).values()];
  for (const trozo of trozos(claves, LOTE)) {
    const { data, error } = await c
      .from('productos_canonicos')
      .upsert(trozo.map((k) => ({ clave: k.clave, origen: k.origen })), { onConflict: 'clave' })
      .select('id, clave');
    if (error) fallar('guardar canonicos', error);
    for (const fila of data) canonicos.set(fila.clave, fila.id);
  }

  const ids = new Map<string, string>();
  const ahora = new Date().toISOString();
  for (const trozo of trozos(productos, LOTE)) {
    const { data, error } = await c
      .from('productos')
      .upsert(
        trozo.map((p) => ({
          proveedor_id: proveedorId,
          id_externo: p.idExterno,
          nombre: p.nombre,
          marca: p.marca,
          presentacion: p.presentacion,
          imagen_url: p.imagenUrl,
          categoria_path: [...p.categoriaPath],
          canonico_id: p.canonica ? (canonicos.get(p.canonica.clave) ?? null) : null,
          actualizado_at: ahora,
        })),
        { onConflict: 'proveedor_id,id_externo' },
      )
      .select('id, id_externo');
    if (error) fallar('guardar productos', error);
    for (const fila of data) ids.set(fila.id_externo, fila.id);
  }
  return ids;
}

export interface FilaLote {
  readonly productoId: string;
  readonly precio: number;
  readonly precioLista: number | null;
  readonly promoKind: PromoKind;
  readonly enStock: boolean;
  readonly stock: number | null;
}

/** Changelog + snapshot. Devuelve los productos nuevos o cambiados (capa 1 del anti-spam). */
export async function aplicarLote(
  c: ClienteServicio,
  tiendaId: string,
  ts: number,
  filas: readonly FilaLote[],
): Promise<Map<string, 'nuevo' | 'cambio'>> {
  const cambiados = new Map<string, 'nuevo' | 'cambio'>();
  for (const trozo of trozos(filas, LOTE)) {
    const { data, error } = await c.rpc('aplicar_lote_precios', {
      p_tienda_id: tiendaId,
      p_ts: aTimestamp(ts),
      p_filas: trozo.map((f) => ({
        producto_id: f.productoId,
        precio: f.precio,
        precio_lista: f.precioLista,
        promo_kind: f.promoKind,
        en_stock: f.enStock,
        stock: f.stock,
      })) as unknown as Json,
    });
    if (error) fallar('aplicar lote de precios', error);
    for (const fila of data) cambiados.set(fila.producto_id, fila.motivo === 'nuevo' ? 'nuevo' : 'cambio');
  }
  return cambiados;
}

export interface PrecioActual {
  readonly productoId: string;
  readonly precio: number;
  readonly precioLista: number | null;
  readonly promoKind: PromoKind;
  readonly enStock: boolean;
  readonly stock: number | null;
}

export async function preciosActuales(c: ClienteServicio, tiendaId: string): Promise<PrecioActual[]> {
  const filas = await paginado('precios actuales', (desde, hasta) =>
    c
      .from('precios_actuales')
      .select('producto_id, precio, precio_lista, promo_kind, en_stock, stock')
      .eq('tienda_id', tiendaId)
      .order('producto_id')
      .range(desde, hasta),
  );
  return filas.map((f) => ({
    productoId: f.producto_id,
    precio: f.precio,
    precioLista: f.precio_lista,
    promoKind: f.promo_kind,
    enStock: f.en_stock,
    stock: f.stock,
  }));
}

/** La categoria de productos que no se vieron en esta corrida: para no marcar sin stock los de un grupo fallido. */
export async function categoriasDeProductos(c: ClienteServicio, ids: readonly string[]): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  for (const trozo of trozos(ids, IDS_POR_PEDIDO)) {
    const { data, error } = await c.from('productos').select('id, categoria_path').in('id', trozo);
    if (error) fallar('categorias de productos', error);
    for (const p of data) out.set(p.id, p.categoria_path);
  }
  return out;
}

export interface FilaHistorial {
  readonly productoId: string;
  /** Epoch en segundos. */
  readonly ts: number;
  readonly precio: number;
  readonly promoKind: PromoKind;
  readonly enStock: boolean;
}

/**
 * El changelog completo de esos productos, en orden cronologico. Completo y no "desde la
 * ventana": la fila que venia de antes de la ventana es la que le da duracion al primer
 * precio de la ventana. Es chico por construccion (una fila por cambio, retencion de 90 dias).
 */
export async function historial(
  c: ClienteServicio,
  tiendaId: string,
  productoIds: readonly string[],
): Promise<Map<string, FilaHistorial[]>> {
  const out = new Map<string, FilaHistorial[]>();
  for (const trozo of trozos(productoIds, IDS_POR_PEDIDO)) {
    const filas = await paginado('historial', (d, h) =>
      c
        .from('precios_cambios')
        .select('producto_id, ts, precio, promo_kind, en_stock')
        .eq('tienda_id', tiendaId)
        .in('producto_id', trozo)
        .order('ts')
        .order('id')
        .range(d, h),
    );
    for (const f of filas) {
      const serie = out.get(f.producto_id) ?? [];
      serie.push({ productoId: f.producto_id, ts: aEpoch(f.ts), precio: f.precio, promoKind: f.promo_kind, enStock: f.en_stock });
      out.set(f.producto_id, serie);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Hallazgos y anti-spam
// ---------------------------------------------------------------------------

export interface AlertaGuardada {
  readonly productoId: string;
  readonly regla: ReglaClave;
  readonly precioAvisado: number;
  readonly hallazgoId: string;
}

export async function alertasVigentes(
  c: ClienteServicio,
  tiendaId: string,
  productoIds: readonly string[],
): Promise<AlertaGuardada[]> {
  const out: AlertaGuardada[] = [];
  for (const trozo of trozos(productoIds, IDS_POR_PEDIDO)) {
    const { data, error } = await c
      .from('alerta_estado')
      .select('producto_id, regla, precio_avisado, hallazgo_id')
      .eq('tienda_id', tiendaId)
      .in('producto_id', trozo);
    if (error) fallar('alertas vigentes', error);
    for (const a of data) {
      out.push({ productoId: a.producto_id, regla: a.regla, precioAvisado: a.precio_avisado, hallazgoId: a.hallazgo_id });
    }
  }
  return out;
}

export interface HallazgoNuevo {
  readonly productoId: string;
  readonly regla: ReglaClave;
  readonly precio: number;
  readonly precioReferencia: number | null;
  readonly ratio: number | null;
  readonly estadoOferta: 'real' | 'inflado' | 'sin_historial';
  readonly detalle: Readonly<Record<string, number>>;
  /** Si es un re-aviso, el hallazgo que reemplaza. */
  readonly reemplaza: string | null;
}

/**
 * Abre hallazgos y deja el estado del anti-spam al dia. Un re-aviso cierra el hallazgo
 * anterior primero: hay un indice unico de "un solo abierto por (tienda, producto, regla)".
 */
export async function abrirHallazgos(
  c: ClienteServicio,
  tiendaId: string,
  corridaId: string,
  notificar: boolean,
  nuevos: readonly HallazgoNuevo[],
): Promise<void> {
  const ahora = new Date().toISOString();
  const reemplazados = nuevos.flatMap((h) => (h.reemplaza ? [h.reemplaza] : []));
  for (const trozo of trozos(reemplazados, IDS_POR_PEDIDO)) {
    const { error } = await c.from('hallazgos').update({ cerrado_at: ahora }).in('id', trozo);
    if (error) fallar('cerrar hallazgos reemplazados', error);
  }
  for (const trozo of trozos(nuevos, LOTE)) {
    const { data, error } = await c
      .from('hallazgos')
      .insert(
        trozo.map((h) => ({
          tienda_id: tiendaId,
          producto_id: h.productoId,
          corrida_id: corridaId,
          regla: h.regla,
          precio: h.precio,
          precio_referencia: h.precioReferencia,
          ratio: h.ratio,
          estado_oferta: h.estadoOferta,
          detalle: h.detalle as Json,
          notificar,
        })),
      )
      .select('id, producto_id, regla, precio');
    if (error) fallar('abrir hallazgos', error);
    const estado = await c.from('alerta_estado').upsert(
      data.map((h) => ({
        tienda_id: tiendaId,
        producto_id: h.producto_id,
        regla: h.regla,
        precio_avisado: h.precio,
        hallazgo_id: h.id,
        actualizado_at: ahora,
      })),
      { onConflict: 'tienda_id,producto_id,regla' },
    );
    if (estado.error) fallar('guardar estado de alertas', estado.error);
  }
}

/** Cierra hallazgos: el precio volvio (con histeresis) o el producto se quedo sin stock. */
export async function cerrarHallazgos(c: ClienteServicio, tiendaId: string, alertas: readonly AlertaGuardada[]): Promise<void> {
  const ahora = new Date().toISOString();
  for (const trozo of trozos(alertas, IDS_POR_PEDIDO)) {
    const cerrar = await c.from('hallazgos').update({ cerrado_at: ahora }).in('id', trozo.map((a) => a.hallazgoId));
    if (cerrar.error) fallar('cerrar hallazgos', cerrar.error);
    for (const a of trozo) {
      const { error } = await c
        .from('alerta_estado')
        .delete()
        .eq('tienda_id', tiendaId)
        .eq('producto_id', a.productoId)
        .eq('regla', a.regla);
      if (error) fallar('borrar estado de alerta', error);
    }
  }
}
