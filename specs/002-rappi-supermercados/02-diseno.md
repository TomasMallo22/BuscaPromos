# 002 — Supermercados de Rappi · Diseño

## Lo verificado antes de diseñar (2026-10-08, zona del Obelisco)

- El router lista los supermercados dentro del grupo `market` como `suboptions`, cada uno con
  su `store_type` (`jumbo`, `disco`, `vea`, `carrefour`, `carrefour_express`, `coto`, `dia`,
  `farmacity_market`) y una tienda en `stores`. De noche aparecen con `is_open: true`.
- El mismo endpoint `dynamic/context/content` sirve su catalogo con
  `state.store_type = <tipo>` y `state.parent_store_type = <tipo>` (en Turbo es `turbo_home`).
  Los 8 devolvieron `aisles_icons_carousel` con 19-21 pasillos.
- `master_product_id` es el mismo entre tiendas (ver `00-propuesta.md`).

## Datos

`0015_tienda_tipo.sql`: `tiendas.tipo text not null default 'turbo'` (el `store_type` de
Rappi). Entra al grant por columna de `authenticated`: la web lo usa para el link y el nombre.

No hace falta tabla nueva. Una direccion ya podia tener varias tiendas (`direcciones_tiendas`)
y un usuario varias suscripciones.

## `packages/providers`

- `rappi/tiendas.ts`: la lista de tipos (`TIENDAS_RAPPI`), cada uno con su nombre visible y su
  cadencia (Turbo 30 min, supermercados 240). **Es el unico lugar** donde vive esa lista.
- `tiendasRappi(router)` reemplaza a `tiendaTurbo`: devuelve una tienda por cada tipo de la
  lista que aparezca, con la ubicacion de la tienda.
- El contrato pasa de `resolverTienda` a `resolverTiendas` (como decia `docs/04` desde el
  principio) y `TiendaResuelta` suma `tipo`. `recorrer` arma el `state` con el tipo.
- `Proveedor.cadenciaMinutos(tipo)`.

## `packages/core`

`medianaOtrasTiendas(precios, minTiendas)`: mediana de los precios del mismo producto canonico
en otras tiendas, o `null` con menos de `minTiendas`. Va al core porque es parte del motor
("no reimplementar la mediana", CLAUDE.md). `PARAMETROS.minTiendasMediana = 2`, que **no esta
en el original** (alli la regla nunca tuvo mas de una tienda real): con 1 sola referencia, un
error de precio en la otra tienda seria un falso positivo convincente (E5).

## `packages/db` y el crawler

- **Re-resolucion horaria.** `direccionesAResolver`: las activas sin cobertura marcada y con
  `resuelta_at` nulo o de hace mas de una hora. `registrarTiendasResueltas` hace upsert de cada
  tienda, vincula y suscribe. Una tienda que deja de aparecer no se toca (E6).
  `sin_cobertura` solo si nunca se resolvio y pasaron 24 h (E7).
- **Cadencia.** `tiendasActivas` trae `tipo` y `ultima_corrida_ok_at`; `tocaRecorrer(tienda,
  cadencia, ahora)` es puro y tiene margen de 5 minutos para que el cron de :07/:37 no la
  saltee por segundos. Orden: las nunca recorridas primero, Turbo antes que supermercados.
- **`vs_otras_tiendas`.** Para los productos cambiados con canonico `rappi_master` o `ean`:
  `preciosEnOtrasTiendas(tienda, canonicos)` lee `precios_actuales` de las demas tiendas en
  stock y sin promo excluida; la mediana la calcula el core.
- `corrida.yml`: timeout de 60 minutos (la primera pasada con 9 tiendas tarda ~35).

## Web

Las cards y los descuentos anunciados muestran la tienda ("en Coto"). El link usa
`/tiendas/{id}-{tipo}`.

## Riesgos

| Riesgo | Mitigacion |
|---|---|
| Primera pasada larga (~35 min) | se recorren primero Turbo y las tiendas nunca vistas; el feed se actualiza solo |
| Rappi limita por volumen | cadencia de 4 h para supermercados, 600 ms entre requests, todo secuencial |
| Supermercados que no estan en todas las zonas | solo se suscribe lo que el router lista para esa direccion |
