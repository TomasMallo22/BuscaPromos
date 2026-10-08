# Bitacora de APIs

_Historico a proposito: su valor esta en el registro de roturas._

Una entrada por cada vez que una API externa cambio, rompio o se arreglo. Formato:

```
## YYYY-MM-DD — <proveedor>: <que paso en una linea>
**Sintoma:** que se vio (codigo HTTP, campo faltante, corrida descartada).
**Causa:** que cambio del otro lado.
**Arreglo:** que se toco, con el commit o el PR.
**Evidencia:** el run del `probe`, el diff del fixture.
```

El diff entre el fixture viejo y la captura nueva del `probe` es la evidencia mas util:
dice exactamente que campo se movio. `npm run fixtures:promover` lo imprime.

---

## 2026-10-07 — Rappi: el flujo de 4 pasos VERIFICADO EN VIVO

**Sintoma:** ninguno. Primera verificacion real contra la API.
**Causa:** —
**Arreglo:** —
**Evidencia:** corrida manual con `curl` desde el contenedor, una vez abierta la red. Los 4
pasos documentados en `docs/04-contrato-proveedores.md` funcionan tal cual estan escritos:

| Paso | Resultado |
|---|---|
| 1. `GET /api/rocket/v2/guest/passport/` | token de 344 chars |
| 2. `POST /api/rocket/v2/guest` con `x-guest-api-key` | `access_token` de 423 chars. La respuesta trae `{access_token, expires_in, first_login, refresh_token, token_type}` |
| 3. `GET .../stores-router/available/principal/?lat=&lng=` | el DFS por `store_type == 'turbo'` encuentra la tienda. Para el Obelisco (-34.60372, -58.38159): **store_id `266872`** |
| 4a. `context: aisles_tree` | componentes `['seasonal_aisle', 'aisles_icons_carousel']`; **30 pasillos** en `aisles_icons_carousel.resource.aisle_icons` |
| 4b. `context: sub_aisles` | 7 sub-pasillos en Bebidas (2804), con `product_count`: Gaseosas 107, Agua 115, Jugos 57 |
| 4c. `context: aisle_detail` | el walk recursivo con duck-test extrae los productos |

`app_version` usado: `web_v1.223.2`. Los headers de `docs/04` funcionan sin cambios.

**Los 10 campos clave estan TODOS presentes**, ninguno faltante: `price`, `real_price`,
`in_stock`, `stock`, `has_global_offers`, `global_offer_max_quantity`, `master_product_id`,
`presentation`, `trademark`, `name`.

Muestra real:

```
Bebida hidratante Suerox limonada x 630m   $2900     lista $2900   stock=True  pres="1 x 630 mL"
Paso de los Toros Gaseosa Pomelo           $3999.2   lista $4999   stock=True  pres="1 X 2 L"
Livra Agua Saborizada Con Gas Citrus       $1583.1   lista $1759   stock=True  pres="1 x 1.5 L"
```

**El formato de `presentation` matchea el regex del parser** (`1 x 630 mL`, `1 X 2 L`,
`1 x 1.5 L`): minuscula y mayuscula en la `x`, decimales con punto. El parser de
`nuevo_vs_pasillo` funciona contra datos reales sin tocarlo.

Lo que esto cambia: `docs/04-contrato-proveedores.md` deja de ser "lo que creemos que devuelve
Rappi" y pasa a ser un hecho fechado. La spec 001 arranca sobre terreno firme.

## 2026-10-08 — Rappi: paginacion de una sola pagina, y la Turbo desaparece de noche

**Sintoma:** ninguno; dos comportamientos descubiertos al capturar los fixtures.
**Causa:** —
**Arreglo:** contemplados en `packages/providers/src/rappi/` desde el primer commit.
**Evidencia:** capturas de `fixtures/rappi/red/` (tienda 266872, pasillo Bebidas) y
`npm run corrida:seca` en vivo:

- `aisle_detail` con `limit: 50` devuelve **el sub-pasillo entero** (Gaseosas: 106 productos en
  la primera pagina) y responde **204** a `offset: 50`. Se pagina hasta tener `product_count` o
  recibir un 204.
- A las 22:37 ART el stores-router **no lista ningun nodo `store_type: 'turbo'`**; solo
  "Rappi Express" (`turbo_express_nc`, store 220673), que es otra tienda. El catalogo de la 266872
  se leyo igual con la tienda cerrada (`available: false`, `in_stock: true`).
- Corrida completa de la 266872: **3.704 productos en 112 s, 0 grupos fallidos**, con 600 ms
  entre requests. 1.034 con precio tachado; el mayor descuento anunciado, 55%.

## 2026-10-08 — Rappi: los supermercados usan la misma API, y la presentacion a veces miente

**Sintoma:** ninguno; verificado antes de la spec 002.
**Causa:** —
**Arreglo:** `packages/providers/src/rappi/tiendas.ts` y `presentacionRappi`.
**Evidencia:** sondas en vivo desde la zona del Obelisco, 23:00-00:30 ART:

- De noche el router lista Jumbo (247105), Disco, Vea, Carrefour (127153), Carrefour Express,
  Coto (130340), Dia (243771) y Farmacity, todos con `is_open: true`. El mismo
  `dynamic/context/content` devuelve su catalogo con `store_type` y `parent_store_type` = el tipo.
- Tamaño de catalogo: Jumbo 6.779, Disco 6.013, Vea 5.449, Carrefour 2.846, Carrefour Express
  6.768, Coto 14.468, Dia 2.862, Farmacity 6.183.
- `master_product_id` compartido: 54 gaseosas en comun entre Jumbo y Coto, 39 tambien en Turbo.
- `corrida:seca` de Dia: 2.953 productos en 84 s. Aparecieron datos malos de Rappi:
  "1 x 45261 L" en un vino (`quantity: 1.12`, `unit_type: l`) — corregido usando lo
  estructurado; y "1 X 15 L" en aguas saborizadas con `quantity: 15` tambien — **sin arreglo**:
  los dos campos dicen lo mismo. Chorizos "1 x 400 g" a $260 con `sale_type: U`: es el dato
  publicado (el chorizo de marca Dia de 300 g estaba a $3.600); se reporta tal cual.
