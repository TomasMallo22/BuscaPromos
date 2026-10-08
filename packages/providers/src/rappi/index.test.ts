/**
 * Rappi contra capturas reales (fixtures/rappi/red/, pasillo Bebidas de la tienda 266872,
 * capturado el 2026-10-08). Integracion real sin red: ejercita el recorrido entero.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ClienteFixtures, ErrorHttp, type ClienteHttp, type PedidoHttp } from '../cliente-http.js';
import type { AlmacenCredenciales, LoteProductos, TiendaResuelta } from '../contrato.js';
import { presentacionRappi, productos, promoKindRappi, tiendasRappi } from './extraer.js';
import { crearRappi } from './index.js';

const FIXTURES = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../fixtures/rappi');
const leer = (archivo: string): unknown => JSON.parse(readFileSync(resolve(FIXTURES, 'red', archivo), 'utf8'));

const rappi = crearRappi({ deviceId: '00000000-0000-4000-8000-000000000000', appVersion: 'web_v1.223.2' });
const tienda: TiendaResuelta = { tipo: 'turbo', idExterno: '266872', nombre: 'Rappi Turbo', consulta: { lat: -34.6, lng: -58.38 } };

/** Un token vigente: los fixtures no tienen passport ni guest, y no hacen falta. */
const credencialesVigentes = (): AlmacenCredenciales & { guardados: number } => ({
  guardados: 0,
  leer: async () => ({ token: 'token-de-prueba', expiraAt: new Date(Date.now() + 5 * 86400_000) }),
  async guardar() {
    this.guardados++;
  },
});

async function recorrerTodo(http: ClienteHttp): Promise<LoteProductos[]> {
  const lotes: LoteProductos[] = [];
  for await (const lote of rappi.recorrer(tienda, { http, credenciales: credencialesVigentes() })) lotes.push(lote);
  return lotes;
}

describe('recorrer, contra el pasillo Bebidas capturado', () => {
  it('trae los 354 productos de Bebidas, cada uno una sola vez', async () => {
    const lotes = await recorrerTodo(new ClienteFixtures(FIXTURES));
    const bebidas = lotes.filter((l) => l.categoriaPath[0] === 'Bebidas').flatMap((l) => l.productos);
    expect(bebidas).toHaveLength(354);
    expect(new Set(bebidas.map((p) => p.idExterno)).size).toBe(354);
  });

  it('los otros 29 pasillos, sin captura, vuelven como grupos fallidos y sin productos (regla de oro 7)', async () => {
    const lotes = await recorrerTodo(new ClienteFixtures(FIXTURES));
    const fallidos = lotes.filter((l) => l.falloMotivo);
    expect(fallidos).toHaveLength(29);
    expect(fallidos.every((l) => l.productos.length === 0 && l.falloMotivo === 'HTTP 404')).toBe(true);
  });

  it('un producto que tambien esta en "Nuevos" queda con su sub-pasillo real', async () => {
    const lotes = await recorrerTodo(new ClienteFixtures(FIXTURES));
    const nuevos = lotes.find((l) => l.categoriaPath[1] === 'Nuevos');
    expect(nuevos?.productos).toHaveLength(0);
    const suerox = lotes.flatMap((l) => l.productos).find((p) => p.idExterno === '2115141882');
    expect(suerox?.categoriaPath).toEqual(['Bebidas', 'Energizantes e isótonicos']);
  });

  it('no pide una segunda pagina si la primera ya trajo el sub-pasillo entero', async () => {
    const http = new ClienteFixtures(FIXTURES);
    await recorrerTodo(http);
    expect(http.pedidos.filter((c) => c.startsWith('aisle_detail:') && !c.endsWith('offset=0'))).toEqual([]);
  });
});

describe('productos', () => {
  it('normaliza los campos que usa el motor', () => {
    const [p] = productos(leer('aisle-detail--2807--offset-0.json'), ['Bebidas', 'Energizantes']).filter(
      (x) => x.idExterno === '2115141882',
    );
    expect(p).toMatchObject({
      nombre: 'Bebida hidratante Suerox limonada x 630ml',
      marca: 'Suerox',
      presentacion: '1 x 630 mL',
      masterExterno: '988416',
      ean: null,
      enStock: true,
    });
    expect(p?.precio).toBeGreaterThan(0);
  });

  // E8: Rappi cambia el layout. El duck-test tiene que seguir encontrando lo mismo.
  it('encuentra los mismos productos con dos niveles mas de anidamiento', () => {
    const original = leer('aisle-detail--2811--offset-0.json');
    const anidado = { envoltorio: [{ otro: { data: original } }] };
    const ids = (x: unknown) => productos(x, ['x']).map((p) => p.idExterno).sort();
    expect(ids(anidado)).toEqual(ids(original));
    expect(ids(original)).toHaveLength(106);
  });

  it('si price deja de ser un numero, falla fuerte', () => {
    expect(() => productos({ product_id: 1, name: 'x', price: '100', in_stock: true }, [])).toThrow();
  });
});

describe('presentacionRappi — el texto contra los campos estructurados (spec 002)', () => {
  // Casos reales: Turbo 266872 y Dia 243771, 2026-10-08.
  it('coinciden: el texto', () => {
    expect(presentacionRappi('1 x 630 mL', 630, 'ml')).toBe('1 x 630 mL');
  });
  it('multipack explicito: el texto, porque quantity es por unidad', () => {
    expect(presentacionRappi('4 x 237 mL', 237, 'ml')).toBe('4 x 237 mL');
  });
  it('texto disparatado ("1 x 45261 L" de un vino de 1,12 L): lo estructurado', () => {
    expect(presentacionRappi('1 x 45261 L', 1.12, 'l')).toBe('1.12 l');
  });
  it('un "15 L" que es 1,5 L no pasa por multipack: no dice "10 x"', () => {
    expect(presentacionRappi('1 X 15 L', 1.5, 'l')).toBe('1.5 l');
  });
  it('sin texto: lo estructurado', () => {
    expect(presentacionRappi('', 354, 'ml')).toBe('354 ml');
  });
  it('unidades que no son peso ni volumen: el texto tal cual (el core las descarta)', () => {
    expect(presentacionRappi('1 Und', 1, 'und')).toBe('1 Und');
  });
});

describe('productos vendidos por peso (spec 002)', () => {
  it('sale_type distinto de U: seVendePorPeso, para que no entre al indice de gondola', () => {
    const [chorizo] = productos(
      { product_id: 1, name: 'Chorizo Parrillero', price: 260, in_stock: true, presentation: '1 x 400 g', quantity: 400, unit_type: 'gr', sale_type: 'WB' },
      [],
    );
    expect(chorizo?.seVendePorPeso).toBe(true);
  });
  it('sale_type U o ausente: no', () => {
    const [p] = productos({ product_id: 1, name: 'x', price: 1, in_stock: true, sale_type: 'U' }, []);
    expect(p?.seVendePorPeso).toBe(false);
  });
});

describe('promoKindRappi', () => {
  it('tope de 1 unidad con oferta global es la promo de cuenta nueva', () => {
    expect(promoKindRappi({ price: 50, real_price: 100, has_global_offers: true, global_offer_max_quantity: 1 })).toBe(
      'promo_usuario_nuevo',
    );
  });
  it('tachado mayor al precio es descuento de lista', () => {
    expect(promoKindRappi({ price: 80, real_price: 100, has_global_offers: true, global_offer_max_quantity: 0 })).toBe(
      'descuento_lista',
    );
  });
  it('sin tachado, ninguna', () => {
    expect(promoKindRappi({ price: 100, real_price: 100 })).toBe('ninguna');
  });
});

describe('tiendasRappi', () => {
  // La forma del router verificada el 2026-10-08: grupos con `suboptions`, tiendas en `stores`.
  const router = (tiendas: Array<{ store_type: string; store_id: string }>) => [
    { store_type: 'restaurant', stores: [{ store_type: 'restaurant', store_id: '135027' }] },
    {
      store_type: 'market',
      suboptions: tiendas.map((t) => ({ store_type: t.store_type, stores: [{ ...t, lat: -34.61, lng: -58.38 }] })),
    },
  ];

  it('de dia: Turbo y los supermercados de la lista, en el orden de la lista', () => {
    const r = router([
      { store_type: 'coto', store_id: '130340' },
      { store_type: 'turbo_express_nc', store_id: '220673' },
      { store_type: 'turbo', store_id: '266872' },
      { store_type: 'leocan_market_nc', store_id: '1' },
      { store_type: 'jumbo', store_id: '247105' },
    ]);
    expect(tiendasRappi(r)).toEqual([
      { tipo: 'turbo', idExterno: '266872', lat: -34.61, lng: -58.38 },
      { tipo: 'jumbo', idExterno: '247105', lat: -34.61, lng: -58.38 },
      { tipo: 'coto', idExterno: '130340', lat: -34.61, lng: -58.38 },
    ]);
  });

  it('de noche: sin Turbo, pero con los supermercados (E1 de la spec 002)', () => {
    const r = router([
      { store_type: 'turbo_express_nc', store_id: '220673' },
      { store_type: 'dia', store_id: '243771' },
    ]);
    expect(tiendasRappi(r).map((t) => t.tipo)).toEqual(['dia']);
  });

  it('Rappi Express no es la Turbo, y una tienda chica no esta en la lista', () => {
    expect(tiendasRappi(router([{ store_type: 'turbo_express_nc', store_id: '220673' }, { store_type: 'leocan_market_nc', store_id: '1' }]))).toEqual([]);
  });
});

describe('recorrer un supermercado', () => {
  it('pide con store_type y parent_store_type del super, no los de Turbo', async () => {
    const cuerpos: unknown[] = [];
    const http: ClienteHttp = {
      async pedirJson<T>(p: PedidoHttp): Promise<T | null> {
        cuerpos.push(p.body);
        return { data: [{ name: 'aisles_icons_carousel', resource: { aisle_icons: [] } }] } as T;
      },
    };
    const coto: TiendaResuelta = { tipo: 'coto', idExterno: '130340', nombre: 'Coto', consulta: { lat: -34.6, lng: -58.38 } };
    for await (const _ of rappi.recorrer(coto, { http, credenciales: credencialesVigentes() })) void _;
    expect(cuerpos[0]).toMatchObject({ stores: [130340], state: { store_type: 'coto', parent_store_type: 'coto' } });
  });

  it('cada tipo tiene su cadencia: Turbo 30 minutos, supermercados 4 horas', () => {
    expect(rappi.cadenciaMinutos('turbo')).toBe(30);
    expect(rappi.cadenciaMinutos('coto')).toBe(240);
  });
});

describe('sesion', () => {
  it('ante un 401 renueva el token una vez y reintenta (E9)', async () => {
    let arbolPedidos = 0;
    const http: ClienteHttp = {
      async pedirJson<T>(p: PedidoHttp): Promise<T | null> {
        if (p.clave === 'passport') return { token: 'p' } as T;
        if (p.clave === 'guest') return { access_token: 'nuevo', expires_in: 604800 } as T;
        if (p.clave === 'aisles_tree') {
          arbolPedidos++;
          if (p.headers?.['Authorization'] !== 'Bearer nuevo') throw new ErrorHttp(401, p.clave);
          return { data: [{ name: 'aisles_icons_carousel', resource: { aisle_icons: [] } }] } as T;
        }
        throw new ErrorHttp(404, p.clave);
      },
    };
    const credenciales = credencialesVigentes();
    const lotes: LoteProductos[] = [];
    for await (const l of rappi.recorrer(tienda, { http, credenciales })) lotes.push(l);
    expect(arbolPedidos).toBe(2);
    expect(credenciales.guardados).toBe(1);
  });
});

describe('claveCanonica', () => {
  const base = productos(leer('aisle-detail--2807--offset-0.json'), ['x'])[0]!;
  it('con master de Rappi: rm', () => {
    expect(rappi.claveCanonica({ ...base, ean: null, masterExterno: '988416' })).toEqual({
      clave: 'rm:988416',
      origen: 'rappi_master',
    });
  });
  it('el EAN gana', () => {
    expect(rappi.claveCanonica({ ...base, ean: '7790040991', masterExterno: '1' })?.origen).toBe('ean');
  });
});
