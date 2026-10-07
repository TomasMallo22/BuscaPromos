# ADR 0005 — promo_kind en vez de un booleano

- **Fecha:** 2026-10-07
- **Estado:** aceptada

## Contexto

El repo original tiene una columna `global_offer` (0/1) que carga **dos significados a la vez**:
(a) "este producto tiene una promo" y (b) "esta promo no me aplica, excluila del historial, de
la mediana, del indice de gondola, y no alertes".

Funciona porque en Rappi solo hay un tipo de promo que no aplica: la de usuario nuevo
("Max. 1 Ud."). Con otros proveedores aparecen segunda unidad, descuento bancario, combos y
precios cuidados, y cada uno tiene una respuesta distinta a la pregunta "¿esto le aplica a esta
persona?".

## Decision

Enum `promo_kind` en la DB, mas `promoKindsExcluidos: PromoKind[]` como politica por proveedor.

## Consecuencias

Los dos significados quedan separados: `promo_kind` dice **que** promo es, y
`politicas.promoKindsExcluidos` dice **cual se ignora**, por proveedor.

**"Excluir" son cuatro cosas, y hay que aplicarlas en los cuatro lados:** no entra al calculo
del precio habitual, no entra a la mediana cross-tienda, no entra al indice de
`nuevo_vs_pasillo`, y no genera alerta. En el original eso estaba implicito en el filtro
`global_offer = 0` repetido en cuatro queries; aca es una funcion `excluido(p, politicas)`.

**En contra:** un enum es menos flexible que texto libre, y cada proveedor nuevo puede necesitar
un valor nuevo, que es una migracion. Se acepta: el valor `'desconocida'` cubre el caso
transitorio sin bloquear.
