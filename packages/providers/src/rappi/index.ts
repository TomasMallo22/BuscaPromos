/**
 * Rappi Turbo. Los cuatro pasos estan verificados en vivo: ver
 * .llm-wiki/wiki/bitacora-api.md y docs/04-contrato-proveedores.md.
 */
import { ErrorHttp, type PedidoHttp } from '../cliente-http.js';
import type {
  CtxProveedor,
  LoteProductos,
  Proveedor,
  TiendaResuelta,
  Ubicacion,
} from '../contrato.js';
import { pasillos, productos, subPasillos, tiendasRappi, type Grupo } from './extraer.js';
import { POLITICAS_RAPPI, SUBPASILLOS_VIDRIERA } from './politicas.js';
import { padreRappi, tipoTiendaRappi } from './tiendas.js';
import { urlProductoRappi } from './url.js';

const BASE = 'https://services.rappi.com.ar';
const URL_CONTENIDO = `${BASE}/api/web-gateway/web/dynamic/context/content/`;
/** El token de invitado dura 7 dias; se renueva un dia antes. */
const RENOVAR_ANTES_MS = 24 * 3600 * 1000;

export interface ConfigRappi {
  /** uuid4 ESTABLE, de un secret. Uno nuevo por corrida es el patron que dispara anti-fraude. */
  readonly deviceId: string;
  /** Primer sospechoso cuando la API rompe. Ver docs/07-operacion.md. */
  readonly appVersion: string;
}

/** ~100 m: alcanza para que Rappi ubique la zona y no identifica una casa. */
const redondear = (x: number) => Math.round(x * 1000) / 1000;

export function crearRappi(config: ConfigRappi): Proveedor {
  const headersBase: Record<string, string> = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36',
    'accept-language': 'es-AR',
    Origin: 'https://www.rappi.com.ar',
    Referer: 'https://www.rappi.com.ar/',
    language: 'es',
    deviceid: config.deviceId,
    Accept: 'application/json',
    'app-version': config.appVersion,
    'Content-Type': 'application/json',
    needAppsFlyerId: 'false',
    include_context_info: 'true',
  };

  /** Pasos 1 y 2: passport + token de invitado. */
  async function tokenNuevo(ctx: CtxProveedor): Promise<string> {
    const passport = await ctx.http.pedirJson<{ token: string }>({
      metodo: 'GET',
      url: `${BASE}/api/rocket/v2/guest/passport/`,
      headers: headersBase,
      clave: 'passport',
    });
    if (!passport?.token) throw new Error('Rappi: el passport no trajo token');
    const guest = await ctx.http.pedirJson<{ access_token: string; expires_in?: number }>({
      metodo: 'POST',
      url: `${BASE}/api/rocket/v2/guest`,
      headers: { ...headersBase, 'x-guest-api-key': passport.token },
      body: {},
      clave: 'guest',
    });
    if (!guest?.access_token) throw new Error('Rappi: el guest no trajo access_token');
    const expiraAt = new Date(Date.now() + (guest.expires_in ?? 7 * 86400) * 1000);
    await ctx.credenciales.guardar(guest.access_token, expiraAt);
    return guest.access_token;
  }

  /** Un pedido autenticado. Ante un 401 renueva el token una vez y reintenta (E9). */
  function sesion(ctx: CtxProveedor) {
    let token: string | null = null;
    const obtener = async (forzar: boolean) => {
      if (!forzar && token) return token;
      if (!forzar) {
        const guardado = await ctx.credenciales.leer();
        if (guardado && guardado.expiraAt.getTime() - Date.now() > RENOVAR_ANTES_MS) {
          return (token = guardado.token);
        }
      }
      return (token = await tokenNuevo(ctx));
    };
    return async <T>(pedido: Omit<PedidoHttp, 'headers'>): Promise<T | null> => {
      const conToken = async (t: string) =>
        ctx.http.pedirJson<T>({ ...pedido, headers: { ...headersBase, Authorization: `Bearer ${t}` } });
      try {
        return await conToken(await obtener(false));
      } catch (e) {
        if (e instanceof ErrorHttp && e.estado === 401) return conToken(await obtener(true));
        throw e;
      }
    };
  }

  const contenido = (t: TiendaResuelta, context: string, extra: Record<string, string>, limit: number, offset: number) => ({
    limit,
    offset,
    state: {
      lat: String(t.consulta.lat),
      lng: String(t.consulta.lng),
      store_type: t.tipo,
      parent_store_type: padreRappi(t.tipo),
      ...extra,
    },
    stores: [Number(t.idExterno)],
    context,
  });

  const motivo = (e: unknown) => (e instanceof ErrorHttp ? `HTTP ${e.estado}` : e instanceof Error ? e.message : 'error');

  return {
    id: 'rappi',
    tipo: 'rappi',
    politicas: POLITICAS_RAPPI,

    async resolverTiendas(u: Ubicacion, ctx: CtxProveedor): Promise<TiendaResuelta[]> {
      const pedir = sesion(ctx);
      const router = await pedir<unknown>({
        metodo: 'GET',
        url: `${BASE}/api/web-gateway/web/stores-router/available/principal/?lat=${u.lat}&lng=${u.lng}`,
        clave: 'stores_router',
      });
      // Se consulta con la ubicacion de la TIENDA si Rappi la da: es un dato publico del
      // comercio, y asi la base no guarda ni siquiera aproximada la ubicacion de nadie.
      return tiendasRappi(router).map((t) => ({
        tipo: t.tipo,
        idExterno: t.idExterno,
        nombre: tipoTiendaRappi(t.tipo)?.nombre ?? null,
        consulta: t.lat !== null && t.lng !== null ? { lat: t.lat, lng: t.lng } : { lat: redondear(u.lat), lng: redondear(u.lng) },
      }));
    },

    cadenciaMinutos: (tipo) => tipoTiendaRappi(tipo)?.cadenciaMinutos ?? 240,

    async *recorrer(t: TiendaResuelta, ctx: CtxProveedor): AsyncIterable<LoteProductos> {
      const pedir = sesion(ctx);
      const pol = POLITICAS_RAPPI;
      // Sin el arbol no hay corrida: que falle entera, no que parezca un catalogo vacio.
      const arbol = await pedir<unknown>({
        metodo: 'POST',
        url: URL_CONTENIDO,
        body: contenido(t, 'aisles_tree', {}, 100, 0),
        clave: 'aisles_tree',
      });
      const vistos = new Set<string>();

      for (const pasillo of pasillos(arbol)) {
        let subs: Grupo[];
        try {
          const r = await pedir<unknown>({
            metodo: 'POST',
            url: URL_CONTENIDO,
            body: contenido(t, 'sub_aisles', { aisle_id: String(pasillo.id), parent_id: String(pasillo.id) }, 50, 0),
            clave: `sub_aisles:${pasillo.id}`,
          });
          subs = subPasillos(r);
        } catch (e) {
          yield { categoriaPath: [pasillo.nombre], productos: [], falloMotivo: motivo(e) };
          continue;
        }
        // Las vidrieras ("Nuevos") al final: el producto se queda con su categoria real.
        subs.sort((a, b) => Number(SUBPASILLOS_VIDRIERA.test(a.nombre)) - Number(SUBPASILLOS_VIDRIERA.test(b.nombre)));

        for (const sub of subs) {
          const categoriaPath = [pasillo.nombre, sub.nombre];
          const delGrupo: LoteProductos['productos'][number][] = [];
          try {
            const idsGrupo = new Set<string>();
            for (let pagina = 0; pagina < pol.maxPaginasPorGrupo; pagina++) {
              const offset = pagina * 50;
              const r = await pedir<unknown>({
                metodo: 'POST',
                url: URL_CONTENIDO,
                body: contenido(t, 'aisle_detail', { aisle_id: String(sub.id), parent_id: String(pasillo.id) }, 50, offset),
                clave: `aisle_detail:${sub.id}:offset=${offset}`,
              });
              if (r === null) break; // 204: no hay mas
              const nuevos = productos(r, categoriaPath).filter((p) => !idsGrupo.has(p.idExterno));
              if (nuevos.length === 0) break;
              for (const p of nuevos) idsGrupo.add(p.idExterno);
              delGrupo.push(...nuevos);
              // Rappi hoy manda el sub-pasillo entero en la primera pagina.
              if (idsGrupo.size >= sub.cantidad) break;
            }
          } catch (e) {
            yield { categoriaPath, productos: [], falloMotivo: motivo(e) };
            continue;
          }
          const propios = delGrupo.filter((p) => !vistos.has(p.idExterno));
          for (const p of propios) vistos.add(p.idExterno);
          yield { categoriaPath, productos: propios };
        }
      }
    },

    urlProducto: (p, t) => urlProductoRappi(p.nombre, t.idExterno, t.tipo),

    claveCanonica: (p) => {
      if (p.ean) return { clave: `ean:${p.ean}`, origen: 'ean' };
      if (p.masterExterno) return { clave: `rm:${p.masterExterno}`, origen: 'rappi_master' };
      return null;
    },
  };
}

export { POLITICAS_RAPPI } from './politicas.js';
