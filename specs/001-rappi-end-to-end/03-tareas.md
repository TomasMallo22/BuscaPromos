# 001 — Rappi end-to-end · Tareas

**Todo lo de esta spec se puede hacer sin red**, salvo la corrida real y el deploy. La red del
contenedor ya esta abierta (bloqueo B1 cerrado), asi que tambien se puede iterar contra la API.

| # | Tarea | Red | Estado |
|---|---|---|---|
| 1 | `packages/core/src/reglas/registry.ts` — la unica definicion de regla | no | ⏳ |
| 2 | `normalizacion/presentacion.ts` + tests (las "Und" se descartan) | no | ⏳ |
| 3 | `deteccion/precio-habitual.ts` + tests — **el hazard del empate** | no | ⏳ |
| 4 | `deteccion/estado-oferta.ts` + tests — **el caso 700→1400→700** | no | ⏳ |
| 5 | `deteccion/pasillo.ts` + tests — **el hazard de `floor(n/10)`** | no | ⏳ |
| 6 | `deteccion/motor.ts` + tests — la estructura de `check()` con el `else if` | no | ⏳ |
| 7 | `npm run reglas:verificar` en verde con el registry real | no | ⏳ |
| 8 | Migraciones 0002–0006 | no | ⏳ |
| 9 | Migracion 0009 (filtros de dos niveles) | no | ⏳ |
| 10 | Migracion 0010 (invitaciones) | no | ⏳ |
| 11 | `db:tipos` + funciones de acceso en `packages/db` | no | ⏳ |
| 12 | Tests de `aplicar_lote_precios` (segunda corrida = cero cambios) | no | ⏳ |
| 13 | Tests de RLS **con dos JWT reales** | no | ⏳ |
| 14 | `packages/providers/contrato.ts` + `cliente-http.ts` | no | ⏳ |
| 15 | `providers/rappi`: politicas, schemas zod, los 4 pasos | no | ⏳ |
| 16 | Capturar fixtures reales y promoverlos | **si** | ⏳ |
| 17 | Tests de parsing contra fixtures, incluido el de anidamiento extra | no | ⏳ |
| 18 | `apps/crawler/resolver-tiendas.ts` | **si** | ⏳ |
| 19 | `apps/crawler/corrida.ts` con guarda del 50% + piso de 100 | **si** | ⏳ |
| 20 | `apps/crawler/notificar.ts` con los filtros de dos niveles | no | ⏳ |
| 21 | Bot de Telegram + webhook | **si** | ⏳ (token del dueño) |
| 22 | `apps/web`: login por invitacion, feed, detalle | no | 🟡 login listo; feed y detalle esperan `hallazgos` |
| 23 | Limpiar los scripts fantasma de `package.json` | no | ⏳ |
| 24 | `corrida.yml`, `corrida-seca.yml`, `probe.yml` | no | ⏳ |
| 25 | Deploy a Vercel | — | ⏳ dueño |
| 26 | Actualizar `.llm-wiki/wiki/estado-actual.md` | no | ⏳ |

## El orden importa

**1 a 7 primero, y sin tocar nada mas.** Es el activo intelectual del proyecto y no depende de
la base, de la red ni de la web. Cuando esos tests esten en verde, lo dificil esta hecho.

**Los tests van antes que el codigo y tienen que fallar.** `superpowers:test-driven-development`.
Para el motor no hay excusa: los valores esperados ya estan validados contra el Python original
en `fixtures/rappi/casos/`, asi que escribir el test es copiar el JSON.

## Deuda conocida a limpiar (tarea 23)

`package.json` declara comandos que apuntan a archivos que no existen: `probe`, `redactar`,
`redactar:verificar`, `fixtures:promover`, `notificar`, `corrida`, `corrida:seca`,
`corrida:offline`, `resolver-tiendas`. Hoy fallan con "modulo no encontrado", que es peor que no
estar. O se implementan en esta spec, o se sacan del `package.json` hasta que existan.
