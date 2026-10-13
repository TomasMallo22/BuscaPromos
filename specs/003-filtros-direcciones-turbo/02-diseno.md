# 003 — Turbo completo, filtro por categoria y direcciones editables · Diseño

## Turbo 24 hs

`TIENDAS_RAPPI` suma `turbo_veinticuatro_nc` ("Rappi Turbo 24 hs", cada 30 min). Verificado
el 2026-10-13 en la zona del dueño: su catalogo responde con `parent_store_type` = el mismo
tipo (30 pasillos, 7.200-8.300 productos segun el punto).

## "Sin cobertura"

`direcciones.fallo_diurno_at`: el primer intento SIN tiendas hecho entre las 10 y las 20 h ART.
`sin_cobertura` solo si la direccion tiene mas de 24 h **y** tuvo un fallo diurno. Las
direcciones sin cobertura se reintentan una vez por dia y, si aparecen tiendas, se limpian. La
decision es una funcion pura (`decidirCobertura`) con tests.

## Suscripciones por direccion (0016)

`suscripciones` era `unique (usuario_id, tienda_id)` con `direccion_id ... on delete set null`:
por eso borrar una direccion dejaba la suscripcion huerfana. Pasa a ser **una suscripcion por
direccion y tienda**:

- se borran las huerfanas (`direccion_id is null`: la de la oficina);
- `direccion_id not null`, FK `on delete cascade`, `unique (direccion_id, tienda_id)`;
- `private.usuario_ve_tienda` no cambia (sigue siendo "existe una suscripcion activa").

**Mover una direccion** (cambiar `lat`/`lng`) dispara un trigger en `private` que borra sus
`direcciones_tiendas` y `suscripciones` y la vuelve a pendiente. Es integridad de datos
derivados, no logica de negocio: sin el trigger, una direccion movida seguiria apuntando a las
tiendas de su ubicacion vieja.

## Categorias comunes

`packages/core/src/normalizacion/categoria.ts`: 14 categorias (`CATEGORIAS`, unica definicion)
y `categoriaComun(categoriaPath)`, que mapea el pasillo de cada tienda ("Lácteos y huevos",
"Quesos y fiambres"...) a una clave comun. Los ~50 nombres reales de las 11 tiendas
(2026-10-13) son el test. Lo que no matchea va a `otros`.

`productos.categoria` (0016): la escribe el crawler al guardar el catalogo. La web filtra por
esa columna (regla de oro 11: la web no clasifica).

## Feed

`/feed?cat=lacteos&q=yogur`: Server Component con `searchParams`. Chips con las categorias y un
campo de busqueda (`ilike` sobre `productos.nombre`). Los filtros van como `!inner` sobre
`productos`.

## Direcciones

- `/api/geocodificar?q=` (route handler, requiere sesion por el middleware): llama a Georef
  `apis.datos.gob.ar/georef/api/direcciones` y devuelve hasta 5 candidatos. No loguea el texto.
- `SelectorUbicacion` (cliente): el mapa + "Usar mi ubicacion" + "Buscar por direccion",
  compartido entre `/direcciones/nueva` y `/direcciones/[id]`.
- `/direcciones/[id]`: editar nombre y ubicacion, y borrar (con confirmacion).

## El buscador cada 30 minutos (0017)

`pg_cron` + `pg_net`: `private.disparar_corrida()` lee el token de Vault
(`github_token_corrida`) y hace el `workflow_dispatch`. Sin el secret no hace nada. Corre en
`'7,37 * * * *'`. El cron de GitHub sigue como respaldo: la `concurrency` del workflow y
`tocaRecorrer` evitan el trabajo doble.
