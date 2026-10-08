/**
 * Por donde pasa todo request a un proveedor. Tres implementaciones con la misma interfaz,
 * para que los tests de parsing sean integracion real sin red. Ver docs/04 y docs/09.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface PedidoHttp {
  readonly metodo: 'GET' | 'POST';
  readonly url: string;
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: unknown;
  /** Clave logica para fixtures: 'aisle_detail:2811:offset=0'. Nunca lleva coordenadas. */
  readonly clave: string;
}

/** Un request que no devolvio 2xx. `estado` 401 dispara la re-autenticacion. */
export class ErrorHttp extends Error {
  constructor(
    readonly estado: number,
    readonly clave: string,
  ) {
    super(`HTTP ${estado} en ${clave}`);
  }
}

export interface ClienteHttp {
  /** `null` si la respuesta vino vacia (204): Rappi lo usa para "no hay mas paginas". */
  pedirJson<T>(pedido: PedidoHttp): Promise<T | null>;
}

const REINTENTABLES = new Set([429, 500, 502, 503, 504]);
const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * La red de verdad. Respeta una pausa entre requests (volumen bajo, regla de oro 16) y
 * reintenta los errores transitorios con backoff de 1.5 * 2^n segundos.
 */
export class ClienteRed implements ClienteHttp {
  #ultimo = 0;

  constructor(
    private readonly opciones: { msEntreRequests: number; reintentos?: number; esperar?: (ms: number) => Promise<void> },
  ) {}

  async pedirJson<T>(pedido: PedidoHttp): Promise<T | null> {
    const dormir = this.opciones.esperar ?? esperar;
    const reintentos = this.opciones.reintentos ?? 3;
    for (let intento = 0; ; intento++) {
      const pausa = this.#ultimo + this.opciones.msEntreRequests - Date.now();
      if (pausa > 0) await dormir(pausa);
      this.#ultimo = Date.now();

      let estado: number;
      try {
        const r = await fetch(pedido.url, {
          method: pedido.metodo,
          headers: pedido.headers ? { ...pedido.headers } : {},
          ...(pedido.body === undefined ? {} : { body: JSON.stringify(pedido.body) }),
          signal: AbortSignal.timeout(30_000),
        });
        if (r.status === 204) return null;
        if (r.ok) {
          const texto = await r.text();
          return texto ? (JSON.parse(texto) as T) : null;
        }
        estado = r.status;
      } catch {
        estado = 0; // red caida o timeout: transitorio
      }
      if ((estado === 0 || REINTENTABLES.has(estado)) && intento < reintentos) {
        await dormir(1500 * 2 ** intento);
        continue;
      }
      throw new ErrorHttp(estado, pedido.clave);
    }
  }
}

interface Manifest {
  readonly capturas: ReadonlyArray<{ readonly clave: string; readonly archivo: string }>;
}

/**
 * Resuelve cada `clave` contra `fixtures/<proveedor>/manifest.json`. Una clave sin captura es
 * un 404: asi un recorrido contra fixtures parciales ejercita tambien los grupos fallidos.
 */
export class ClienteFixtures implements ClienteHttp {
  readonly #archivos: Map<string, string>;
  readonly pedidos: string[] = [];

  constructor(private readonly dir: string) {
    const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')) as Manifest;
    this.#archivos = new Map(manifest.capturas.map((c) => [c.clave, c.archivo]));
  }

  async pedirJson<T>(pedido: PedidoHttp): Promise<T | null> {
    this.pedidos.push(pedido.clave);
    const archivo = this.#archivos.get(pedido.clave);
    if (!archivo) throw new ErrorHttp(404, pedido.clave);
    return JSON.parse(readFileSync(join(this.dir, archivo), 'utf8')) as T;
  }
}
