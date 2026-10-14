/**
 * El fan-out de avisos por Telegram (spec 004). Corre despues de la corrida, en el mismo job.
 *
 * Patron outbox (skill alertas-telegram): primero se REGISTRA que hay que avisar, despues se
 * envia y se marca. Si el proceso muere en el medio, lo registrado se manda en la proxima
 * corrida; si Telegram esta caido, queda con `error` y se reintenta. Correr dos veces no duplica.
 *
 * Se loguean conteos. Nunca un chat_id, un mail ni el nombre de un usuario (regla de oro 14).
 */
import {
  AVISO_VENCIDO,
  descuentosNotificables,
  destinatarios,
  enviadosUltimaHora,
  hallazgosNotificables,
  marcarAviso,
  pendientes,
  registrarAvisos,
  suscripcionesActivas,
  yaRegistrado,
  type AvisoPendiente,
} from '@buscapromos/db/avisos';
import type { ClienteServicio } from '@buscapromos/db/servicio';
import { DESCUENTO_ANUNCIADO_MINIMO, elegirDescuentos, elegirHallazgos, elegirParaEnviar, VENCE_EN_S } from './avisos.js';
import { mensajeDescuento, mensajeHallazgo } from './mensaje.js';

export interface EntornoAvisos {
  readonly db: ClienteServicio;
  /** Manda un mensaje. Lanza si falla. */
  readonly enviar: (chatId: string, texto: string) => Promise<void>;
  readonly ahora: number;
  readonly log: (linea: string) => void;
}

const ratioDe = (p: AvisoPendiente) => (p.tipo === 'hallazgo' ? (p.hallazgo.ratio ?? 1) : p.descuento.precio / p.descuento.precioLista);

const textoDe = (p: AvisoPendiente) => (p.tipo === 'hallazgo' ? mensajeHallazgo(p.hallazgo) : mensajeDescuento({ ...p.descuento, termino: p.termino }));

export async function notificar(e: EntornoAvisos): Promise<void> {
  const usuarios = await destinatarios(e.db);
  if (usuarios.length === 0) {
    e.log('avisos: nadie tiene Telegram conectado con preferencias');
    return;
  }
  const suscripciones = await suscripcionesActivas(e.db, usuarios.map((u) => u.usuarioId));
  const tiendas = [...new Set([...suscripciones.values()].flatMap((m) => [...m.keys()]))];
  const [hallazgos, descuentos] = await Promise.all([
    hallazgosNotificables(e.db, tiendas, e.ahora - VENCE_EN_S),
    descuentosNotificables(e.db, tiendas, 1 - DESCUENTO_ANUNCIADO_MINIMO),
  ]);

  let registrados = 0;
  let enviados = 0;
  let fallidos = 0;
  let vencidos = 0;
  for (const u of usuarios) {
    const susc = suscripciones.get(u.usuarioId) ?? new Map<string, number>();
    const prefs = u;

    // Capa 5: solo lo de sus tiendas y detectado despues de suscribirse.
    const propios = hallazgos.filter((h) => susc.has(h.tiendaId) && h.detectadoAt >= susc.get(h.tiendaId)!);
    const ya = await yaRegistrado(e.db, u.usuarioId);
    const nuevosH = elegirHallazgos(propios.filter((h) => !ya.hallazgos.has(h.hallazgoId)), prefs);
    const comoHallazgo = new Set(propios.filter((h) => ya.hallazgos.has(h.hallazgoId)).map((h) => `${h.tiendaId}|${h.productoId}`));
    for (const h of nuevosH) comoHallazgo.add(`${h.tiendaId}|${h.productoId}`);
    const nuevosD = elegirDescuentos(descuentos.filter((d) => susc.has(d.tiendaId)), prefs, ya.descuentos, comoHallazgo);

    await registrarAvisos(e.db, u.usuarioId, nuevosH.map((h) => h.hallazgoId), nuevosD);
    registrados += nuevosH.length + nuevosD.length;

    const listos = (await pendientes(e.db, u.usuarioId)).map((p) => ({ ...p, ratio: ratioDe(p) }));
    const plan = elegirParaEnviar(listos, { ahora: e.ahora, enviadosUltimaHora: await enviadosUltimaHora(e.db, u.usuarioId), prefs });
    for (const p of plan.vencidos) {
      await marcarAviso(e.db, u.usuarioId, p, AVISO_VENCIDO);
      vencidos++;
    }
    for (const p of plan.enviar) {
      // Un aviso que falla no rompe la corrida ni los demas avisos.
      try {
        await e.enviar(u.chatId, textoDe(p));
        await marcarAviso(e.db, u.usuarioId, p, null);
        enviados++;
      } catch (error) {
        await marcarAviso(e.db, u.usuarioId, p, `telegram: ${error instanceof Error ? error.message : String(error)}`).catch(() => undefined);
        fallidos++;
      }
    }
  }
  e.log(`avisos: ${usuarios.length} usuarios, ${registrados} nuevos, ${enviados} enviados, ${fallidos} fallidos, ${vencidos} vencidos`);
}
