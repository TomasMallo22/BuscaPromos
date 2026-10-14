/**
 * Las decisiones de los avisos por Telegram, sin I/O (spec 004). `notificar.ts` lee, llama a esto,
 * registra y envia. Ver la skill `alertas-telegram`: el unico modo en que este proyecto falla de
 * verdad es que el usuario deje de leer los avisos.
 */
import { decidirAlerta, REGISTRY, seMuestra, terminoQueCoincide, type ReglaClave } from '@buscapromos/core';

export interface PreferenciasAvisos {
  readonly categorias: readonly string[];
  readonly terminos: readonly string[];
  readonly silencioDesde: number;
  readonly silencioHasta: number;
  readonly maxPorHora: number;
}

/** Descuento anunciado minimo para avisar por un producto escrito (decision del dueño, 2026-10-13). */
export const DESCUENTO_ANUNCIADO_MINIMO = 0.3;
/** Un aviso que no salio en un dia ya no es noticia. */
export const VENCE_EN_S = 24 * 3600;

/** ¿`ahora` cae en el horario silencioso? Horas en Argentina (UTC-3 todo el año). Puede cruzar la medianoche. */
export function enSilencio(ahora: number, desde: number, hasta: number): boolean {
  if (desde === hasta) return false;
  const hora = Math.floor(ahora / 3600 - 3) % 24;
  return desde < hasta ? hora >= desde && hora < hasta : hora >= desde || hora < hasta;
}

export interface HallazgoCandidato {
  readonly hallazgoId: string;
  readonly productoId: string;
  readonly tiendaId: string;
  readonly regla: ReglaClave;
  readonly ratio: number | null;
  readonly categoria: string;
  readonly nombre: string;
}

/**
 * Los hallazgos que le interesan al usuario (categoria o termino) y los extremos de cualquier
 * cosa (spec 005), uno por producto: la regla de menor ratio, y en empate la de menor `orden`
 * del registry (capa 4 del anti-spam). Sin intereses no llega nada: es opt-in (spec 004).
 */
export function elegirHallazgos<T extends HallazgoCandidato>(candidatos: readonly T[], p: PreferenciasAvisos): T[] {
  if (p.categorias.length === 0 && p.terminos.length === 0) return [];
  const mejor = new Map<string, T>();
  for (const h of candidatos.filter((h) => seMuestra(h, p))) {
    const clave = `${h.tiendaId}|${h.productoId}`;
    const actual = mejor.get(clave);
    const ratio = (x: T) => x.ratio ?? 1;
    if (!actual || ratio(h) < ratio(actual) || (ratio(h) === ratio(actual) && REGISTRY[h.regla].orden < REGISTRY[actual.regla].orden)) {
      mejor.set(clave, h);
    }
  }
  return [...mejor.values()];
}

export interface DescuentoCandidato {
  readonly productoId: string;
  readonly tiendaId: string;
  readonly nombre: string;
  readonly precio: number;
  readonly precioLista: number;
}

/**
 * Los descuentos ANUNCIADOS por Rappi que se avisan: solo por termino (no por categoria: serian
 * decenas por dia), de 30% o mas, y con la capa 2 del anti-spam (`decidirAlerta` del core) contra
 * lo ya avisado. Un producto que ya va como hallazgo no se manda dos veces.
 *
 * `avisados` y `yaComoHallazgo` van por `tiendaId|productoId`.
 */
export function elegirDescuentos<T extends DescuentoCandidato>(
  candidatos: readonly T[],
  p: PreferenciasAvisos,
  avisados: ReadonlyMap<string, number>,
  yaComoHallazgo: ReadonlySet<string>,
): Array<T & { termino: string }> {
  return candidatos.flatMap((d) => {
    const clave = `${d.tiendaId}|${d.productoId}`;
    if (yaComoHallazgo.has(clave) || d.precioLista <= 0 || 1 - d.precio / d.precioLista < DESCUENTO_ANUNCIADO_MINIMO) return [];
    const termino = terminoQueCoincide(d.nombre, p.terminos);
    if (!termino) return [];
    const avisado = avisados.get(clave);
    if (decidirAlerta(avisado === undefined ? null : { precioAvisado: avisado }, d.precio) === 'mantener') return [];
    return [{ ...d, termino }];
  });
}

export interface Pendiente {
  readonly clave: string;
  /** Menor es mas descuento: sale primero. */
  readonly ratio: number;
  /** Epoch en segundos. */
  readonly creadoAt: number;
}

/**
 * Que sale ahora (capa 5): nada en horario silencioso (queda pendiente, no se descarta), y fuera
 * de el, hasta el tope por hora contando lo que ya salio, los de mas descuento primero. Lo de
 * mas de 24 h vence.
 */
export function elegirParaEnviar<T extends Pendiente>(
  pendientes: readonly T[],
  c: { ahora: number; enviadosUltimaHora: number; prefs: PreferenciasAvisos },
): { enviar: T[]; vencidos: T[] } {
  if (enSilencio(c.ahora, c.prefs.silencioDesde, c.prefs.silencioHasta)) return { enviar: [], vencidos: [] };
  const vencidos = pendientes.filter((p) => c.ahora - p.creadoAt > VENCE_EN_S);
  const vigentes = pendientes.filter((p) => c.ahora - p.creadoAt <= VENCE_EN_S).sort((a, b) => a.ratio - b.ratio);
  const cupo = Math.max(0, c.prefs.maxPorHora - c.enviadosUltimaHora);
  return { enviar: vigentes.slice(0, cupo), vencidos };
}
