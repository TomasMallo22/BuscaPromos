# 002 — Supermercados de Rappi · Tareas

| # | Tarea | Red | Estado |
|---|---|---|---|
| 1 | Migracion 0015 (`tiendas.tipo`) + tipos | no | ✅ |
| 2 | `providers/rappi/tiendas.ts` + `tiendasRappi` + tests contra un router sintetico | no | ✅ |
| 3 | Contrato: `resolverTiendas`, `TiendaResuelta.tipo`, `cadenciaMinutos`; `recorrer` por tipo | no | ✅ |
| 4 | `core`: `medianaOtrasTiendas` + `minTiendasMediana` + tests | no | ✅ |
| 5 | `db`: re-resolucion, cadencia, `preciosEnOtrasTiendas` | no | ✅ |
| 6 | Crawler: `tocaRecorrer`, re-resolucion horaria, `vs_otras_tiendas` en la deteccion | no | ✅ |
| 7 | Web: nombre de la tienda en las cards, link por tipo | no | ✅ |
| 8 | `corrida:seca` contra un supermercado en vivo | **si** | ✅ |
| 9 | `corrida.yml` timeout 60, docs (04, 07, 11) y wiki | no | ✅ |
| 10 | Primera pasada real con supermercados | **si** | ⏳ |

## Lo que aparecio en el camino

- **La presentacion de Rappi miente a veces** (vino "1 x 45261 L"). `presentacionRappi` elige
  entre el texto y la cantidad estructurada; lo vendido por peso queda afuera del indice de
  gondola. Ver `bitacora-api.md`.
- **Limitacion conocida:** si Rappi pone mal la cantidad en los dos lados ("15 L" en un agua de
  1,5 L), `nuevo_vs_pasillo` la marca como muy barata. No hay forma confiable de corregirlo.
