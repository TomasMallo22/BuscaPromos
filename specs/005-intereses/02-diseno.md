# 005 — Mis intereses · Diseño

## Sin migracion

Los intereses son `perfiles.avisos_categorias` y `perfiles.avisos_terminos` (0019). Se
mantienen los nombres: renombrarlos obliga a desplegar la web y el crawler a la vez que la
migracion, y no cambia nada para el usuario.

## Core

- `normalizacion/intereses.ts`: `coincideTermino` y `terminoQueCoincide` se mudan del crawler
  (la web los necesita, y no se reimplementan), mas `interesa(producto, intereses)`: la
  categoria esta elegida o el nombre coincide con un termino.
- `registry`: cada regla declara `extrema: boolean`. Son extremas `precio_absurdo`,
  `caida_vs_historial` (umbral 0.5 contra el precio habitual) y `gran_descuento` (50% y oferta
  `real`). No lo son `descuento_extremo` (solo el tachado: regla de oro 1), `vs_otras_tiendas`
  ni `nuevo_vs_pasillo`. `seMuestra(hallazgo, intereses)` = `interesa || extrema`.

## Crawler (`avisos.ts`)

`elegirHallazgos` usa `seMuestra` en vez de "categoria o termino". El resto de la 004 queda
igual (descuentos anunciados solo por termino; sin intereses no llega nada).

## Web

- `/feed`: tres modos. Con `?cat=` o `?q=`: el filtro, como en la 003. Con `?todo=1`, o sin
  intereses: todo. Si no: **Mis intereses**.
- En Mis intereses, los hallazgos se leen como siempre (hay cientos abiertos, no miles: se
  leen hasta 300) y se filtran con `seMuestra`. La web no recalcula nada (regla de oro 11):
  filtra hallazgos ya calculados con lo que dice el registry.
- Los descuentos anunciados son miles: se filtran en la base. `descuentosAnunciados` recibe los
  intereses y arma un `or` sobre `productos`: `categoria in (...)` o, por termino, un `and` de
  `ilike` por palabra. En el patron las vocales y la ñ van como `_` (cualquier letra) para que
  "azucar" encuentre "Azúcar", y las palabras de 5+ letras pierden la ultima. Lo que trae se
  refina con `interesa` (el mismo criterio que Telegram).
- Ajustes: la seccion **Mis intereses** (el formulario de la 004, con otros textos) va
  primero; Telegram despues.

## Alternativas descartadas

- Filtrar al guardar: ver la propuesta.
- Un `unaccent` en la base para buscar sin tildes: hace falta una columna generada con una
  funcion inmutable propia. El `_` en el patron alcanza porque despues se refina en TS.
