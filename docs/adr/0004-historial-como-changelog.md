# ADR 0004 — El historial es un changelog, no un snapshot

- **Fecha:** 2026-10-07
- **Estado:** aceptada

## Contexto

La alternativa obvia es un snapshot por corrida: una fila por producto por corrida. Es mas
simple de consultar ("dame el precio del dia X") y mas facil de razonar.

## Decision

`precios_cambios` recibe **una fila solo cuando cambia** alguno de
`(precio, precio_lista, promo_kind, en_stock)`. Es append-only. La invariante se fuerza dentro
de `private.aplicar_lote_precios`, no en el crawler.

## Consecuencias

**Las cuentas:** 6000 productos x 16 corridas/dia x 30 dias = **2.9 millones de filas por mes
por tienda**. Con cuatro tiendas, 12 millones. Con changelog son decenas de miles: los precios
de supermercado cambian, pero no cada 90 minutos.

**La invariante va en la funcion de Postgres, no en el crawler.** Si dependiera de que el
crawler se acuerde de comparar antes de insertar, cualquier camino nuevo (un backfill, un
reproceso) la rompe sin que nadie se entere. Dentro de `aplicar_lote_precios` hay un solo lugar
donde puede romperse.

**Consecuencia para las consultas:** "el precio en el dia X" no es un `select` directo, hay que
buscar el ultimo cambio anterior a X. Es el costo aceptado, y esta encapsulado en
`packages/db`.

**Consecuencia en el motor:** `precioHabitual` recorre pares de filas consecutivas y calcula
duraciones. Eso solo tiene sentido sobre un changelog; con snapshots habria que reconstruir los
tramos. El algoritmo y el modelo de datos estan acoplados a proposito.

Retencion: 90 dias en `precios_cambios` (spec 003). Mas que eso no aporta: `historial_dias` es 14.
