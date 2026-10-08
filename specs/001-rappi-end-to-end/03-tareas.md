# 001 — Rappi end-to-end · Tareas

**Todo lo de esta spec se puede hacer sin red**, salvo la corrida real y el deploy. La red del
contenedor ya esta abierta (bloqueo B1 cerrado), asi que tambien se puede iterar contra la API.

| # | Tarea | Red | Estado |
|---|---|---|---|
| 1 | `packages/core/src/reglas/registry.ts` — la unica definicion de regla | no | ✅ |
| 2 | `normalizacion/presentacion.ts` + tests (las "Und" se descartan) | no | ✅ |
| 3 | `deteccion/precio-habitual.ts` + tests — **el hazard del empate** | no | ✅ |
| 4 | `deteccion/estado-oferta.ts` + tests — **el caso 700→1400→700** | no | ✅ |
| 5 | `deteccion/pasillo.ts` + tests — **el hazard de `floor(n/10)`** | no | ✅ |
| 6 | `deteccion/motor.ts` + tests — la estructura de `check()` con el `else if` | no | ✅ |
| 7 | `npm run reglas:verificar` en verde con el registry real | no | ✅ |
| 8 | Migraciones 0009–0013 (catalogo, precios, `aplicar_lote`, corridas, hallazgos) | no | ✅ |
| 9 | `packages/core/src/deteccion/anti-spam.ts` + tests (capas 2 y 3) | no | ✅ |
| 10 | `packages/providers`: contrato, `cliente-http` (red y fixtures) | no | ✅ |
| 11 | `providers/rappi`: politicas, los 4 pasos, walk con duck-test | no | ✅ |
| 12 | Capturar fixtures reales (Obelisco), redactar, tests de parsing | **si** | ✅ |
| 13 | `db:tipos` + funciones de acceso en `packages/db` (web y crawler) | no | ✅ |
| 14 | `apps/crawler`: resolver direcciones pendientes | **si** | ✅ |
| 15 | `apps/crawler`: corrida con guarda del 50% + piso de 100, deteccion sobre los cambiados | **si** | ✅ |
| 16 | `corrida.yml` (cron 30 min + `workflow_dispatch`, `concurrency`); la corrida seca quedo como comando local (`npm run corrida:seca`) | no | ✅ |
| 17 | Web: `/direcciones/nueva` con GPS + Leaflet, guardar + disparar el workflow | no | ✅ |
| 18 | Web: feed con los estados (buscando, sin cobertura, juntando historial) y las cards | no | ✅ |
| 19 | Secrets de Actions y token de GitHub en Vercel | — | ⏳ dueño |
| 20 | Primera corrida real de punta a punta desde la web | **si** | ⏳ |
| 21 | Tests de RLS **con dos JWT reales** | no | ⏳ |
| 22 | Migraciones 0014 (filtros) y 0015 (invitaciones) | no | ⏳ |
| 23 | `apps/crawler/notificar.ts` con los filtros de dos niveles + bot de Telegram | **si** | ⏳ (token del dueño) |
| 24 | Web: detalle `/feed/[id]` con el grafico de historial | no | ⏳ |
| 25 | Limpiar los scripts fantasma de `package.json` | no | ⏳ |
| 26 | Actualizar `.llm-wiki/wiki/estado-actual.md` | no | ⏳ |

**Reordenadas el 2026-10-07**: la direccion desde la web y la primera busqueda al guardarla
pasaron adelante de Telegram (ver `00-propuesta.md`). Cuanto antes corra el buscador, antes
empieza a contar el historial que necesitan las reglas buenas.

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
