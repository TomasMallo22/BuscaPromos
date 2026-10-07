# Fuentes: factibilidad por proveedor

_Investigado el 2026-10-07. **Rappi esta verificado en vivo**: el flujo de 4 pasos completo
corrio contra la API real ese mismo dia (ver `bitacora-api.md`). El resto sale de documentacion
oficial y de leer codigo de scrapers open source que estuvieron corriendo contra estos endpoints
en sep-oct 2026, y sigue sin confirmarse._

**Cada afirmacion de esta tabla necesita confirmarse con el `probe` antes de construir sobre
ella.** La columna "verificado en vivo" dice si eso ya paso.

| Fuente | Veredicto | Verificado en vivo | Playwright |
|---|---|---|---|
| SEPA / datos abiertos | FACIL | no | no |
| VTEX (Jumbo, Disco, Vea, Carrefour, Dia, ChangoMas) | FACIL | no | no |
| Coto (Constructor.io) | MEDIO | no | no |
| La Anonima (API propia) | MEDIO | no | no |
| Precios Claros (API CloudFront) | MEDIO | no | no |
| Rappi | MEDIO | no | solo para catalogo completo via storefront |
| PedidosYa | **NO VIABLE** | no | si, + IP residencial |

## Rappi — el proveedor de la spec 001

`BASE = https://services.rappi.com.ar`. Flujo de 4 pasos, sin cuenta de usuario:

1. `GET /api/rocket/v2/guest/passport/` → `{"token": ...}`
2. `POST /api/rocket/v2/guest` con header `x-guest-api-key: <passport>`, body `{}` →
   `{"access_token": ...}`, dura 7 dias
3. `GET /api/web-gateway/web/stores-router/available/principal/?lat=&lng=` → la tienda viene
   anidada; se busca con DFS el primer nodo con `store_type == "turbo"` y `store_id`
4. `POST /api/web-gateway/web/dynamic/context/content/` — endpoint polimorfico. Body
   `{limit, offset, state: {lat, lng, store_type, parent_store_type, ...}, stores: [id], context}`,
   con `context` en `aisles_tree` | `sub_aisles` | `aisle_detail`. Paginas de 50 por `offset`.

Anti-bot laxo: **no bloquea IPs de datacenter** — verificado de primera mano el 2026-10-07
desde el contenedor, sin captcha ni 403. Detalle completo en `docs/04-contrato-proveedores.md`,
y la corrida de verificacion con sus numeros en `bitacora-api.md`.

Veredicto corregido a **FACIL**: no hace falta Playwright. La API de invitado de
`services.rappi.com.ar` da el catalogo completo paginado; lo del storefront con Next.js y
device-id era una via alternativa que no necesitamos.

## VTEX — la spec 004

`GET https://{dominio}/api/catalog_system/pub/products/search?fq=C:/{cat}&_from=&_to=`.
Sin auth, sin API key, sin anti-bot (Carrefour tiene Cloudflare pero sin challenge).

Lo que hay que recordar:

- **Maximo 50 items por request** (`_to - _from <= 49`) y **tope duro `_from <= 2500`**. Hay
  que particionar por subcategoria hoja o por bandas de precio `fq=P:[a TO b]`.
- El total viene en el **header de respuesta `resources`**, formato `"{from}-{to}/{total}"`.
- Precio en `items[].sellers[].commertialOffer` → `Price`, `ListPrice`,
  `PriceWithoutDiscount`, `AvailableQuantity`, `Teasers`, `DiscountHighLight`. El typo
  "commertialOffer" es original de VTEX y nunca se corrigio.
- **El parametro `sc` no es uniforme**: Carrefour a veces omite `sellers` si no mandás `sc=1`,
  pero **Jumbo/Disco/Vea rechazan `sc` con HTTP 400**. Pedir sin `sc`, reintentar con `sc=1`
  solo si falta `sellers`.
- **El `ListPrice` de Cencosud (Jumbo/Disco/Vea) esta roto**: viene inflado ~82x el `Price`
  real en la mayor parte del catalogo. No es un descuento, es dato de referencia corrupto.
  Sin sanity check, la UI muestra falsos "-99%".
- Las promos reales de Cencosud **no** estan en `Teasers` (vienen vacios) sino en un endpoint
  no documentado `/_v/search-promotions` que requiere un seller de sucursal especifico.
- **Regionalizacion**: sin `regionId` los precios son los default de CABA. Hay que fijar
  sucursal explicitamente, o los datos mienten en silencio.

## PedidosYa — descartado

API interna con campos de precio excelentes (`pricing.price`, `pricing.beforePrice`,
`campaigns[]`), pero detras de **PerimeterX**: 403 + captcha, y bloquea IPs de datacenter, asi
que GitHub Actions no sirve. Requiere Playwright + stealth + IP residencial. Ver ADR 0011.

## SEPA — la fuente legitima

ZIPs oficiales diarios en `datos.produccion.gob.ar`, licencia **CC-BY 4.0**, ~300 MB/dia,
estructura "zip de zips" con `comercio.csv` / `sucursales.csv` / `productos.csv` por comercio.
+70.000 productos, ~3.600 comercios, **incluye precio promocional**. Lag ~1 dia, asi que no
sirve para flash sales; sirve como baseline de precio habitual por EAN. Es la unica fuente con
licencia que habilita el uso.
