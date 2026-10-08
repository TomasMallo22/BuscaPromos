/**
 * Las decisiones de una corrida, sin I/O: que se descarta, que se marca sin stock, que dispara
 * y que se abre o se cierra. La corrida (`corrida.ts`) solo lee, llama a esto y escribe.
 */
import {
  debeCerrar,
  decidirAlerta,
  estadoOferta,
  evaluarReglas,
  PARAMETROS,
  precioHabitual,
  type Disparo,
  type EstadoOferta,
  type FilaPrecio,
  type ReferenciaPasillo,
} from '@buscapromos/core';
import type { AlertaGuardada, HallazgoNuevo } from '@buscapromos/db/crawler';

/** Piso absoluto: una tienda de 60 productos que trae 31 pasa el 50% y marcaria 29 como desaparecidos. */
const PISO_PRODUCTOS = 100;

/** Regla de oro 6: una corrida incompleta no es una corrida. */
export function evaluarGuarda(vistos: number, conocidos: number): { ok: true } | { ok: false; motivo: string } {
  if (vistos < PISO_PRODUCTOS) return { ok: false, motivo: `trajo ${vistos} productos, menos que el piso de ${PISO_PRODUCTOS}` };
  if (conocidos > 0 && vistos < 0.5 * conocidos) {
    return {
      ok: false,
      motivo: `trajo ${vistos} de ${conocidos} productos conocidos (${Math.round((100 * vistos) / conocidos)}%)`,
    };
  }
  return { ok: true };
}

const empiezaCon = (path: readonly string[], prefijo: readonly string[]) =>
  prefijo.length > 0 && prefijo.every((p, i) => path[i] === p);

/**
 * Lo que estaba en stock y no aparecio. Solo se llama si el proveedor declara
 * `faltanteEsSinStock` (regla de oro 8). Lo que pertenece a un grupo que fallo NO se marca:
 * el error de red no es evidencia de que el producto no este (regla de oro 7).
 */
export function faltantes(
  actuales: ReadonlyArray<{ productoId: string; enStock: boolean }>,
  vistos: ReadonlySet<string>,
  categorias: ReadonlyMap<string, readonly string[]>,
  gruposFallidos: ReadonlyArray<readonly string[]>,
): string[] {
  return actuales
    .filter((a) => a.enStock && !vistos.has(a.productoId))
    .filter((a) => {
      const path = categorias.get(a.productoId);
      // Sin categoria conocida no hay como saber si era de un grupo fallido: no se toca.
      return path !== undefined && !gruposFallidos.some((g) => empiezaCon(path, g));
    })
    .map((a) => a.productoId);
}

export const subPasilloDe = (categoriaPath: readonly string[], nivel: number): string =>
  categoriaPath.slice(0, nivel).join(' › ');

/** Las reglas que dispara un producto, con su historial ya cargado (incluida la fila de hoy). */
export function detectarProducto(e: {
  precio: number;
  precioLista: number | null;
  promoExcluida: boolean;
  enStock: boolean;
  historial: readonly FilaPrecio[];
  /** Solo hace falta si no hay precio habitual. */
  pasillo: ReferenciaPasillo | null;
  ahora: number;
}): { disparos: Disparo[]; estadoOferta: EstadoOferta } {
  const habitual = precioHabitual(e.historial, PARAMETROS.historialDias, e.ahora);
  const oferta = estadoOferta(e.historial, e.ahora);
  const anterior = e.historial.length >= 2 ? e.historial.at(-2)!.precio : null;
  const disparos = evaluarReglas({
    producto: {
      precio: e.precio,
      precioLista: e.precioLista ?? 0,
      promoExcluida: e.promoExcluida,
      enStock: e.enStock,
      precioAnterior: anterior,
    },
    habitual,
    oferta,
    // vs_otras_tiendas necesita dos tiendas con identidad comparable: llega con la spec 004.
    mediana: null,
    pasillo: habitual === null ? e.pasillo : null,
  });
  return { disparos, estadoOferta: oferta?.estado ?? 'sin_historial' };
}

export interface ResultadoProducto {
  readonly productoId: string;
  readonly precio: number;
  readonly enStock: boolean;
  readonly estadoOferta: EstadoOferta;
  readonly disparos: readonly Disparo[];
}

/** Capas 2 y 3 del anti-spam, aplicadas a los productos que cambiaron en esta corrida. */
export function planificarHallazgos(
  resultados: readonly ResultadoProducto[],
  vigentes: readonly AlertaGuardada[],
): { abrir: HallazgoNuevo[]; cerrar: AlertaGuardada[] } {
  const porClave = new Map(vigentes.map((v) => [`${v.productoId}|${v.regla}`, v]));
  const abrir: HallazgoNuevo[] = [];
  const cerrar: AlertaGuardada[] = [];

  for (const r of resultados) {
    const disparadas = new Set<string>();
    for (const d of r.disparos) {
      disparadas.add(d.regla);
      const vigente = porClave.get(`${r.productoId}|${d.regla}`) ?? null;
      const decision = decidirAlerta(vigente, r.precio);
      if (decision === 'mantener') continue;
      abrir.push({
        productoId: r.productoId,
        regla: d.regla,
        precio: r.precio,
        precioReferencia: d.precioReferencia,
        ratio: d.ratio,
        estadoOferta: r.estadoOferta,
        detalle: d.detalle,
        reemplaza: decision === 'realertar' ? vigente!.hallazgoId : null,
      });
    }
    for (const v of vigentes) {
      if (v.productoId !== r.productoId || disparadas.has(v.regla)) continue;
      if (debeCerrar(v, { precio: r.precio, enStock: r.enStock, sigueDisparando: false })) cerrar.push(v);
    }
    // Sin stock cierra tambien lo que "sigue disparando" (el motor ya no dispara sin stock,
    // asi que esto cubre el caso de arriba; queda explicito por la regla de oro 5).
  }
  return { abrir, cerrar };
}
