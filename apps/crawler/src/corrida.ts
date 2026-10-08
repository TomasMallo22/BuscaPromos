/**
 * Una corrida: resolver las direcciones nuevas y recorrer cada tienda con suscriptores.
 * Docs: docs/01-arquitectura.md, docs/03-motor-deteccion.md seccion 5, spec 001.
 *
 * Lo que se loguea son conteos. Nunca coordenadas, tokens ni nombres de usuario (regla de
 * oro 14): el log de Actions de un repo publico es publico.
 */
import { indicePasillo, referenciaPasillo, type FilaPrecio, type ProductoPasillo } from '@buscapromos/core';
import {
  abrirHallazgos,
  alertasVigentes,
  aplicarLote,
  categoriasDeProductos,
  cerrarCorrida,
  cerrarHallazgos,
  direccionesAResolver,
  guardarCredencial,
  guardarProductos,
  historial,
  iniciarCorrida,
  leerCredencial,
  marcarCorridaOk,
  marcarSinCobertura,
  preciosActuales,
  preciosEnOtrasTiendas,
  registrarTiendasResueltas,
  tiendasActivas,
  type FilaLote,
  type TiendaActiva,
} from '@buscapromos/db/crawler';
import type { ClienteServicio } from '@buscapromos/db/servicio';
import {
  promoExcluida,
  type ClienteHttp,
  type CtxProveedor,
  type ProductoNormalizado,
  type Proveedor,
} from '@buscapromos/providers';
import {
  detectarProducto,
  evaluarGuarda,
  faltantes,
  planificarHallazgos,
  presentacionComparable,
  subPasilloDe,
  tocaRecorrer,
  type ResultadoProducto,
} from './planificar.js';

/** De noche Rappi esconde la Turbo del router: "sin cobertura" recien despues de un dia sin encontrarla. */
const ESPERA_SIN_COBERTURA_S = 24 * 3600;

export interface Entorno {
  readonly db: ClienteServicio;
  readonly http: ClienteHttp;
  readonly proveedor: Proveedor;
  readonly appVersion: string | null;
  readonly commitSha: string | null;
  readonly log: (linea: string) => void;
}

const ahoraEpoch = () => Math.floor(Date.now() / 1000);

function ctxDe(e: Entorno): CtxProveedor {
  return {
    http: e.http,
    credenciales: {
      leer: () => leerCredencial(e.db, e.proveedor.id),
      guardar: (token, expiraAt) => guardarCredencial(e.db, e.proveedor.id, token, expiraAt),
    },
  };
}

/**
 * Paso 1: las direcciones nuevas, y cada hora las ya resueltas, para sumar tiendas que antes no
 * estaban (Turbo a la mañana, spec 002 E2). Una sola consulta al router por direccion.
 */
export async function resolverDirecciones(e: Entorno): Promise<void> {
  const direcciones = await direccionesAResolver(e.db);
  if (direcciones.length === 0) return;
  let tiendasNuevas = 0;
  let sinTiendaAhora = 0;
  let sinCobertura = 0;
  for (const d of direcciones) {
    const tiendas = await e.proveedor.resolverTiendas({ lat: d.lat, lng: d.lng }, ctxDe(e));
    if (tiendas.length > 0) {
      tiendasNuevas += await registrarTiendasResueltas(
        e.db,
        d,
        tiendas.map((t) => ({ proveedorId: e.proveedor.id, ...t })),
      );
    } else if (d.resueltaAt === null && ahoraEpoch() - d.creadaAt > ESPERA_SIN_COBERTURA_S) {
      await marcarSinCobertura(e.db, d.id);
      sinCobertura++;
    } else {
      sinTiendaAhora++;
    }
  }
  e.log(
    `direcciones: ${direcciones.length} consultadas, ${tiendasNuevas} tiendas nuevas, ` +
      `${sinTiendaAhora} sin tiendas por ahora (se reintenta), ${sinCobertura} sin cobertura`,
  );
}

/** Paso 2: recorrer una tienda, aplicar los precios y detectar sobre lo que cambio. */
export async function recorrerTienda(e: Entorno, tienda: TiendaActiva): Promise<void> {
  const pol = e.proveedor.politicas;
  const corridaId = await iniciarCorrida(e.db, tienda.id, { appVersion: e.appVersion, commitSha: e.commitSha });
  const etiqueta = `${tienda.nombre ?? tienda.tipo} ${tienda.idExterno}`;
  try {
    const antes = await preciosActuales(e.db, tienda.id);
    const conocidos = antes.filter((a) => a.enStock).length;
    const ts = ahoraEpoch();

    // Recorrer y guardar por lote: el catalogo entero nunca esta en memoria dos veces.
    const vistos = new Map<string, { producto: ProductoNormalizado; canonicoId: string | null }>();
    const gruposFallidos: string[][] = [];
    const cambiados = new Map<string, 'nuevo' | 'cambio'>();
    const resuelta = { tipo: tienda.tipo, idExterno: tienda.idExterno, nombre: tienda.nombre, consulta: tienda.consulta };
    for await (const lote of e.proveedor.recorrer(resuelta, ctxDe(e))) {
      if (lote.falloMotivo) {
        gruposFallidos.push([...lote.categoriaPath]);
        continue;
      }
      if (lote.productos.length === 0) continue;
      const ids = await guardarProductos(
        e.db,
        e.proveedor.id,
        lote.productos.map((p) => ({ ...p, canonica: e.proveedor.claveCanonica(p) })),
      );
      const filas: FilaLote[] = [];
      for (const p of lote.productos) {
        const guardado = ids.get(p.idExterno);
        if (!guardado) continue;
        const id = guardado.id;
        vistos.set(id, { producto: p, canonicoId: guardado.canonicoId });
        filas.push({ productoId: id, precio: p.precio, precioLista: p.precioLista, promoKind: p.promoKind, enStock: p.enStock, stock: p.stock });
      }
      // E6: los precios se aplican aunque la corrida despues se descarte.
      for (const [id, motivo] of await aplicarLote(e.db, tienda.id, ts, filas)) cambiados.set(id, motivo);
    }

    const guarda = evaluarGuarda(vistos.size, conocidos);
    const resumen = {
      productos_vistos: vistos.size,
      productos_conocidos: conocidos,
      grupos_fallidos: gruposFallidos.map((g) => g.join(' › ')),
    };
    if (!guarda.ok) {
      // Regla de oro 6: ni alertas, ni "nuevos", ni "desaparecidos".
      await cerrarCorrida(e.db, corridaId, {
        ...resumen,
        estado: 'descartada',
        descartada_motivo: guarda.motivo,
        productos_cambiados: cambiados.size,
        hallazgos_nuevos: 0,
      });
      e.log(`${etiqueta}: DESCARTADA — ${guarda.motivo}`);
      return;
    }

    // Faltantes: en Rappi desaparecer es quedarse sin stock (regla de oro 8).
    if (pol.faltanteEsSinStock) {
      const noVistos = antes.filter((a) => a.enStock && !vistos.has(a.productoId));
      if (noVistos.length > 0) {
        const categorias = await categoriasDeProductos(e.db, noVistos.map((a) => a.productoId));
        const sinStock = new Set(faltantes(antes, new Set(vistos.keys()), categorias, gruposFallidos));
        const filas = antes
          .filter((a) => sinStock.has(a.productoId))
          .map((a) => ({ ...a, enStock: false }));
        for (const [id, motivo] of await aplicarLote(e.db, tienda.id, ts, filas)) cambiados.set(id, motivo);
      }
    }

    // El indice de gondola, con lo que esta a la venta HOY en esta tienda.
    const enGondola: ProductoPasillo[] = [...vistos.values()].map(({ producto: p }) => ({
      subPasillo: subPasilloDe(p.categoriaPath, pol.nivelAgrupacionPasillo),
      presentacion: presentacionComparable(p),
      precio: p.precio,
      promoExcluida: promoExcluida(p.promoKind, pol),
      enStock: p.enStock,
    }));
    const indice = indicePasillo(enGondola);

    // Capa 1 del anti-spam: solo se evalua lo que es nuevo o cambio.
    const ids = [...cambiados.keys()];
    const series = await historial(e.db, tienda.id, ids);
    const actualesPorId = new Map(antes.map((a) => [a.productoId, a]));
    // vs_otras_tiendas (spec 002): solo productos con identidad comparable. `claveCanonica`
    // ya no le da canonico a lo que no tiene `ean` ni `rappi_master` (regla de oro 15).
    const canonicos = [...new Set(ids.flatMap((id) => vistos.get(id)?.canonicoId ?? []))];
    const otras = canonicos.length > 0 ? await preciosEnOtrasTiendas(e.db, tienda.id, canonicos, pol.promoKindsExcluidos) : new Map<string, number[]>();
    const resultados: ResultadoProducto[] = [];
    for (const id of ids) {
      const visto = vistos.get(id)?.producto;
      const canonicoId = vistos.get(id)?.canonicoId ?? null;
      const previo = actualesPorId.get(id);
      const precio = visto?.precio ?? previo?.precio;
      if (precio === undefined) continue;
      const promoKind = visto?.promoKind ?? previo?.promoKind ?? 'ninguna';
      const excluida = promoExcluida(promoKind, pol);
      const enStock = visto?.enStock ?? false;
      const filas: FilaPrecio[] = (series.get(id) ?? []).map((f) => ({
        ts: f.ts,
        precio: f.precio,
        promoExcluida: promoExcluida(f.promoKind, pol),
        enStock: f.enStock,
      }));
      const pasillo = visto
        ? referenciaPasillo(indice, {
            subPasillo: subPasilloDe(visto.categoriaPath, pol.nivelAgrupacionPasillo),
            presentacion: presentacionComparable(visto),
            precio,
            promoExcluida: excluida,
            enStock,
          })
        : null;
      const { disparos, estadoOferta } = detectarProducto({
        precio,
        precioLista: visto?.precioLista ?? previo?.precioLista ?? null,
        promoExcluida: excluida,
        enStock,
        historial: filas,
        pasillo,
        otrasTiendas: canonicoId ? (otras.get(canonicoId) ?? []) : [],
        ahora: ts,
      });
      resultados.push({ productoId: id, precio, enStock, estadoOferta, disparos });
    }

    const vigentes = await alertasVigentes(e.db, tienda.id, ids);
    const plan = planificarHallazgos(resultados, vigentes);
    // La primera corrida de una tienda se ve en la web pero no se avisa (E1).
    await abrirHallazgos(e.db, tienda.id, corridaId, tienda.primeraCorridaOk, plan.abrir);
    await cerrarHallazgos(e.db, tienda.id, plan.cerrar);

    await cerrarCorrida(e.db, corridaId, {
      ...resumen,
      estado: 'ok',
      descartada_motivo: null,
      productos_cambiados: cambiados.size,
      hallazgos_nuevos: plan.abrir.length,
    });
    await marcarCorridaOk(e.db, tienda.id, !tienda.primeraCorridaOk);
    e.log(
      `${etiqueta}: ok — ${vistos.size} productos, ${cambiados.size} cambiaron, ` +
        `${plan.abrir.length} hallazgos nuevos, ${plan.cerrar.length} cerrados, ${gruposFallidos.length} grupos fallidos`,
    );
  } catch (error) {
    const motivo = error instanceof Error ? error.message : String(error);
    await cerrarCorrida(e.db, corridaId, {
      estado: 'error',
      descartada_motivo: motivo.slice(0, 500),
      productos_vistos: 0,
      productos_conocidos: 0,
      productos_cambiados: 0,
      hallazgos_nuevos: 0,
      grupos_fallidos: [],
    }).catch(() => undefined);
    e.log(`${etiqueta}: ERROR — ${motivo}`);
    throw error;
  }
}

/**
 * Todo: direcciones primero, despues cada tienda a la que le toque segun su cadencia (Turbo cada
 * 30 minutos, supermercados cada 4 horas). Una tienda que falla no frena a las demas.
 */
export async function correr(e: Entorno): Promise<{ errores: number }> {
  await resolverDirecciones(e);
  const todas = await tiendasActivas(e.db);
  const ahora = ahoraEpoch();
  const tiendas = todas.filter((t) => tocaRecorrer(t.ultimaCorridaOk, e.proveedor.cadenciaMinutos(t.tipo), ahora));
  e.log(`tiendas con suscriptores: ${todas.length}; les toca ahora: ${tiendas.length}`);
  let errores = 0;
  for (const t of tiendas) {
    try {
      await recorrerTienda(e, t);
    } catch {
      errores++;
    }
  }
  return { errores };
}
