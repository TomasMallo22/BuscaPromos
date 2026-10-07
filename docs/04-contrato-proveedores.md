# 04 — Contrato de proveedores

Un proveedor es una fuente de precios: Rappi, una tienda VTEX, Coto. El contrato es lo que
hace que agregar uno no obligue a tocar `packages/core`.

**La spec 004 (VTEX) es el examen de este contrato.** Si agregar VTEX requiere modificar el
motor de deteccion, el contrato estaba mal diseñado.

## La interfaz

```ts
// packages/providers/src/contrato.ts
export interface Proveedor {
  readonly id: string;                 // 'rappi', 'jumbo', 'carrefour'
  readonly tipo: TipoProveedor;
  readonly politicas: PoliticasProveedor;

  resolverTiendas(u: Ubicacion, ctx: CtxProveedor): Promise<TiendaResuelta[]>;
  recorrer(t: TiendaResuelta, ctx: CtxProveedor): AsyncIterable<LoteProductos>;
  urlProducto(p: ProductoNormalizado, t: TiendaResuelta): string;
  claveCanonica(p: ProductoNormalizado): { clave: string; origen: OrigenClave };
}

export interface ProductoNormalizado {
  idExterno: string;
  nombre: string;
  marca?: string;
  presentacion?: string;       // "1 X 473 mL" — lo parsea packages/core
  imagenUrl?: string;
  ean?: string;
  masterExterno?: string;      // master_product_id de Rappi
  categoriaPath: string[];     // ['Lacteos','Yogures'] o 4 niveles en VTEX
  precio: number;
  precioLista?: number;
  promoKind: PromoKind;
  enStock: boolean;
  stock?: number;
}

export interface LoteProductos {
  productos: ProductoNormalizado[];
  categoriaPath: string[];
  falloMotivo?: string;        // si viene, el grupo va a corridas.grupos_fallidos
}
```

**`recorrer` devuelve un `AsyncIterable`, no un `Promise<Producto[]>`.** Dos razones: permite
aplicar lotes a la DB sin tener 6000 productos en memoria, y el `falloMotivo` por lote modela
el set `failed` del original sin un canal lateral de errores.

## Las politicas

Todo lo que varia entre proveedores es declarativo, no `if`s en el codigo:

```ts
export interface PoliticasProveedor {
  faltanteEsSinStock: boolean;      // Rappi true; VTEX false (deja 'agotado')
  promoKindsExcluidos: PromoKind[]; // Rappi: ['promo_usuario_nuevo']
  confiarPrecioLista: 'si' | 'no' | 'con_sanity_check';
  factorSanityPrecioLista: number;  // Cencosud: 3 (descartar si lista > 3 x precio)
  nivelesTaxonomia: number;
  nivelAgrupacionPasillo: number;   // que prefijo de categoriaPath usar como "sub-pasillo"
  minComparables: number;
  msEntreRequests: number;
  maxPaginasPorGrupo: number;
}
```

`faltanteEsSinStock` es la regla de oro 8 hecha codigo: en Rappi, que un producto desaparezca
del catalogo significa que se quedo sin stock; los supermercados lo dejan listado como agotado.
Tratar los dos igual produce "desapariciones" falsas en masa.

`promoKindsExcluidos` resuelve el pecado 4. Excluir significa cuatro cosas:

```ts
export const excluido = (p: { promoKind: PromoKind }, pol: PoliticasProveedor) =>
  pol.promoKindsExcluidos.includes(p.promoKind);
```

y hay que aplicarlo en: `precioHabitual`, la mediana cross-tienda, el indice de
`nuevo_vs_pasillo`, y la generacion de alertas.

## `ClienteHttp` — trabajar sin red

```ts
export interface ClienteHttp {
  pedirJson<T>(req: {
    metodo: 'GET' | 'POST';
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
    clave?: string;   // clave logica para fixtures: 'aisle_detail:112233:offset=0'
  }): Promise<T>;
}
```

| Implementacion | Que hace |
|---|---|
| `ClienteRed` | `undici`. Reintenta `{429,500,502,503,504}` con backoff `1.5 * 2^n`, re-auth automatica en 401, respeta `msEntreRequests` |
| `ClienteFixtures` | resuelve `clave` contra `fixtures/<proveedor>/manifest.json`. Si falta, lanza con el comando de `probe` exacto para capturarlo |
| `ClienteGrabador` | pasa por red **y** escribe el fixture. Lo usa el workflow `probe` |

Con esto los tests de parsing son **integracion real sin red**: ejercitan el flujo completo, la
paginacion y la normalizacion. Ver [`09-fixtures-y-probe.md`](09-fixtures-y-probe.md).

## Rappi — el proveedor de la spec 001

`BASE = https://services.rappi.com.ar`.

| Paso | Request |
|---|---|
| 1 | `GET /api/rocket/v2/guest/passport/` → `{"token"}` |
| 2 | `POST /api/rocket/v2/guest`, header `x-guest-api-key: <passport>`, body `{}` → `{"access_token"}`, dura 7 dias |
| 3 | `GET /api/web-gateway/web/stores-router/available/principal/?lat=&lng=` |
| 4 | `POST /api/web-gateway/web/dynamic/context/content/` |

**Paso 3:** la tienda viene anidada entre varias sub-verticales `turbo_*`. Se resuelve con un
**DFS sobre todo el JSON** buscando el primer nodo con `store_type === 'turbo'` y `store_id`.
Devuelve `null` si no hay cobertura; el original reintenta a los 20 y 40 segundos porque la
tienda a veces desaparece unos minutos del router.

**Paso 4** es un endpoint polimorfico. Body:

```json
{ "limit": 50, "offset": 0,
  "state": { "lat": "...", "lng": "...", "store_type": "turbo",
             "parent_store_type": "turbo_home" },
  "stores": [ 112233 ], "context": "..." }
```

| `context` | `state` extra | Devuelve |
|---|---|---|
| `aisles_tree` (limit 100) | — | componente `name == 'aisles_icons_carousel'` → `resource.aisle_icons` |
| `sub_aisles` | `aisle_id`, `parent_id` | componentes `name == 'aisles'` → `resource.id` |
| `aisle_detail` | `aisle_id` (sub-pasillo), `parent_id` (pasillo) | productos, paginas de 50 por `offset` |

**Headers:**

```
User-Agent: <Chrome desktop>          accept-language: es-AR
Origin: https://www.rappi.com.ar      language: es
Referer: https://www.rappi.com.ar/    deviceid: <uuid4 estable, persistido>
Accept: application/json              app-version: web_v1.223.2
Content-Type: application/json        needAppsFlyerId: false
Authorization: Bearer <access_token>  include_context_info: true
```

El `deviceid` tiene que ser **estable**. Uno nuevo en cada corrida es el patron que dispara
anti-fraude. Va en un secret, no se genera al vuelo.

**La extraccion de productos no asume la forma del JSON.** Es un walk recursivo con un
duck-test:

```ts
if ('product_id' in obj && 'price' in obj) acc.set(String(obj.product_id), obj);
```

Eso es lo que lo hace robusto a que Rappi cambie el layout de los componentes. **Conservalo.**
Hay un test que toma un fixture, lo envuelve en dos niveles mas de anidamiento, y verifica que
sigue encontrando los mismos productos.

**Campos → significado:**

| Campo Rappi | Destino |
|---|---|
| `price` | `precio` |
| `real_price` | `precioLista` (el tachado) |
| `in_stock`, `stock` | `enStock`, `stock` |
| `has_global_offers` + `global_offer_max_quantity === 1` | `promoKind = 'promo_usuario_nuevo'` |
| `master_product_id` | `masterExterno` → clave canonica `rm:` |
| `presentation`, `trademark`, `image_url`, `name` | idem |

No hay EAN. No hay URL de producto: se construye
`https://www.rappi.com.ar/tiendas/{store_id}-turbo/s?term={nombre}`. La ficha `/p/{slug}` es
generica y Rappi elige la tienda, que puede ser otra que la que tiene el precio.

## Como se agrega un proveedor

1. `packages/providers/src/<id>/politicas.ts` — las politicas, con un comentario por cada
   valor que no sea el default y por que.
2. `packages/providers/src/<id>/schemas.ts` — zod schemas de las respuestas. Sirven para tres
   cosas: parsear, validar que el fixture no se podrio, y tipar.
3. `packages/providers/src/<id>/index.ts` — la implementacion del contrato.
4. Fixtures: capturar con `probe`, redactar, promover. **Sin fixtures no hay proveedor.**
5. Una fila en `proveedores` via `supabase/seed.sql`, con `politicas` como espejo del archivo TS.
6. Tests de parsing contra los fixtures.

Cargá la skill `proveedor-nuevo` antes de empezar.
