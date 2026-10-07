# NNN — <titulo> · Tareas

En orden. **La columna "red" no es opcional**: la red del contenedor esta cerrada, asi que el
orden tiene que poner primero todo lo que no la necesita. Ver `docs/09-fixtures-y-probe.md`.

| # | Tarea | Red | Estado |
|---|---|---|---|
| 1 | | no | |
| 2 | | no | |
| 3 | | Actions | |

## Sin red (hacer primero)

<Todo lo que se puede hacer contra fixtures y contra `supabase start`, que es docker local.>

## Con red o en Actions

<Lo que necesita `probe`, `corrida-seca` o la API real.>

## Orden de los tests

> Si la spec toca el motor de deteccion: **los tests se escriben primero y tienen que fallar.**
> `superpowers:test-driven-development`.
