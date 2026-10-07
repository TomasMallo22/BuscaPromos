# ADR 0003 — La dimension proveedor existe desde el dia 1

- **Fecha:** 2026-10-07
- **Estado:** aceptada

## Contexto

El repo original usa `PRIMARY KEY (store_id, product_id)` en todas las tablas. Con un solo
proveedor funciona perfecto. Con dos, nada impide que otro proveedor tenga un `store_id` 900
igual que Rappi, y las filas colisionan silenciosamente.

La tentacion es dejarlo para cuando haga falta: la spec 001 tiene un solo proveedor.

## Decision

Ninguna tabla tiene PK `(tienda, producto)`. Todo cuelga de `tiendas.id` (uuid), que cuelga de
`proveedor_id`. Se implementa en la spec 001, aunque la 001 tenga un solo proveedor.

## Consecuencias

**Se hace ahora porque despues implica migrar todo el historial de precios**, que es el activo
que tarda 14 dias en existir y no se puede regenerar. Un cambio de PK sobre `precios_cambios`
con meses de datos es exactamente el tipo de migracion que no se hace nunca y termina en un
parche.

El costo hoy es bajo: una columna y un uuid de mas. El costo en el mes 6 es rehacer la base.

Consecuencia secundaria: `direcciones` y `tiendas` son tablas separadas. En el original estaban
fusionadas en `locations`, lo que impedia que una misma direccion tuviera tienda en Rappi **y**
en otro proveedor a la vez.
