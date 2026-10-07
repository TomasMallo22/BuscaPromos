# ADR 0006 — Identidad canonica, y el fuzzy no habilita comparar

- **Fecha:** 2026-10-07
- **Estado:** aceptada

## Contexto

`vs_otras_tiendas` es potencialmente la regla mas valiosa: compara el mismo producto entre
tiendas. En el original funciona con `master_product_id`, una identidad propietaria de Rappi
que no existe cross-proveedor.

El fallback natural es matchear por nombre + marca + presentacion normalizados.

## Decision

`productos_canonicos` con `clave` y `origen` (`ean` | `rappi_master` |
`nombre_marca_presentacion`). **Solo `ean` y `rappi_master` habilitan `vs_otras_tiendas`.**

## Consecuencias

El matching por nombre va a juntar `"Yogur Ser Frutilla 190g"` con `"...190g x4"`. Entonces el
pote a $1.200 contra una mediana de $4.000 (contaminada por el pack) dispara `vs_otras_tiendas`
con ratio 0.3 y manda una alerta **convincente y falsa**.

Es la peor clase de falso positivo, porque no se ve raro. Y el unico modo en que este proyecto
falla de verdad es que el usuario deje de leer las alertas.

**Se acepta menos cobertura a cambio de no tener esa clase de error.** La clave `nmp` se
calcula igual y sirve para agrupar en la UI; simplemente no habilita la regla.

Si alguna vez se quiere habilitar: spec propia, con precision medida contra una muestra de ~200
pares etiquetados a mano y un umbral >= 0.98. Sin ese numero, no.

Camino mas barato: la spec 005 (SEPA) publica precios por **EAN** en ~3.600 comercios, lo que
mejora la identidad cross-proveedor sin tocar el matching.
