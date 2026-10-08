/**
 * Las tiendas de Rappi que se recorren (spec 002). Es el UNICO lugar donde vive esta lista: el
 * `store_type` de Rappi, el nombre que ve el usuario y cada cuanto se recorre.
 *
 * Elegidas por el dueño el 2026-10-08. No "todo Rappi": ni restaurantes (no hay precio de
 * gondola que comparar) ni las ~150 tiendas chicas, por volumen (regla de oro 16).
 */
export interface TipoTiendaRappi {
  /** `store_type` de Rappi. Va a `tiendas.tipo` y al `state` de cada request. */
  readonly tipo: string;
  readonly nombre: string;
  /** Turbo cambia precios seguido y es chico; un supermercado cambia poco y es grande. */
  readonly cadenciaMinutos: number;
}

export const TIENDAS_RAPPI: readonly TipoTiendaRappi[] = [
  { tipo: 'turbo', nombre: 'Rappi Turbo', cadenciaMinutos: 30 },
  { tipo: 'jumbo', nombre: 'Jumbo', cadenciaMinutos: 240 },
  { tipo: 'disco', nombre: 'Disco', cadenciaMinutos: 240 },
  { tipo: 'vea', nombre: 'Vea', cadenciaMinutos: 240 },
  { tipo: 'carrefour', nombre: 'Carrefour', cadenciaMinutos: 240 },
  { tipo: 'carrefour_express', nombre: 'Carrefour Express', cadenciaMinutos: 240 },
  { tipo: 'coto', nombre: 'Coto', cadenciaMinutos: 240 },
  { tipo: 'dia', nombre: 'Dia', cadenciaMinutos: 240 },
  { tipo: 'farmacity_market', nombre: 'Farmacity', cadenciaMinutos: 240 },
];

const POR_TIPO = new Map(TIENDAS_RAPPI.map((t) => [t.tipo, t]));

export const tipoTiendaRappi = (tipo: string): TipoTiendaRappi | undefined => POR_TIPO.get(tipo);

/** Lo que va como `parent_store_type`: Turbo cuelga de `turbo_home`; cada super, de si mismo. */
export const padreRappi = (tipo: string): string => (tipo === 'turbo' ? 'turbo_home' : tipo);
