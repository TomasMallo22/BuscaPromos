# docs/ desactualizados

_Ultima actualizacion: 2026-10-07_

Lista viva de documentacion que ya no refleja la realidad. Si arreglás uno, borrá su entrada.

| Doc | Que dice de mas o de menos | Desde |
|---|---|---|
| `specs/001-rappi-end-to-end/01-escenarios.md` (E5) y `docs/03-motor-deteccion.md` seccion 7 | Dicen que en el arranque ciego `caida_vs_historial` no puede disparar porque necesita `historial_dias` de historia. **Es falso**, en el original y en el port: el precio habitual existe apenas hay un tramo previo cerrado. Con $500 hace 3 dias y $200 hoy, dispara con ratio 0.4 (verificado contra `check` del Python). `motor.test.ts` fija el comportamiento real. Falta que el dueño decida si se acepta (y se corrigen los docs) o si se agrega un minimo de historia (y eso es un cambio de regla, con revision adversarial). | 2026-10-07 |

## Por que existe este archivo

Un `docs/` que miente es peor que no tener `docs/`: hace que se construya sobre una premisa
falsa. Cuando un cambio deja un doc desactualizado y no hay tiempo de arreglarlo en el acto,
se anota acá. Lo que no esta en esta lista se asume vigente.
