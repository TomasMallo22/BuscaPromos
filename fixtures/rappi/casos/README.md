# casos/ — series sinteticas para el motor de deteccion

**Se diseñan, no se capturan.** No necesitan red y nunca la necesitaron: son lo primero que se
puede escribir de cualquier spec que toque `packages/core`.

## Formato

`filas` son los cambios de precio en orden cronologico (la ultima es el estado actual), con el
tiempo expresado en `diasAtras` para que se lean. El test los convierte a epoch con
`ts = ahora - diasAtras * 86400`.

`esperado` es lo que tiene que devolver el motor. Si un caso tiene `desdeDiasAtras`, tambien se
verifica el `since` que devuelve `estadoOferta` — eso es lo que pincha el colapso de reajustes.

## Los casos y que defienden

| Caso | Defiende |
|---|---|
| `inflado-sube-y-baja` | **el caso que justifica todo el diseño**: suben y "rebajan" al precio de siempre |
| `real-caida-sostenida` | una oferta de verdad se detecta como `real` |
| `sin-historial-corto` | sin historial suficiente no se opina |
| `oferta-permanente` | 7 dias al mismo precio es su precio normal, no una oferta |
| `reajustes-dos-por-ciento` | los reajustes de ±2% colapsan a un solo tramo |
| `empate-de-duracion` | **en empate gana el precio mas viejo** (`>` estricto, no `>=`) |
| `pasillo-comparables` | el indice de sub-pasillo, el piso de 8 comparables, y que las "Und" se ignoran |

Si `inflado-sube-y-baja` da `real`, el precio habitual no esta ponderando por duracion y todo
el proyecto miente. Es el primero que hay que hacer pasar.
