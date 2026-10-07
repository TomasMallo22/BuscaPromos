# 001 — Rappi end-to-end · Diseño

## Como se construye

### `packages/core` — el motor (no toca red ni DB)

```
src/
├── tipos.ts                 ya existe
├── reglas/
│   ├── tipos.ts             ya existe: ReglaClave
│   └── registry.ts          NUEVO — la UNICA definicion de cada regla
├── deteccion/
│   ├── precio-habitual.ts   NUEVO — moda ponderada por duracion
│   ├── estado-oferta.ts     NUEVO — real | inflado | sin_historial
│   ├── pasillo.ts           NUEVO — indice de sub-pasillo + percentil
│   ├── motor.ts             NUEVO — evaluarReglas(), la estructura de check()
│   └── *.test.ts            los tests van PRIMERO y tienen que fallar
└── normalizacion/
    └── presentacion.ts      NUEVO — "1 x 630 mL" -> ("ml", 630)
```

El reloj se inyecta (`ahora: number`, epoch en segundos). Si aparece un `await` o un import de
`packages/db` dentro de `deteccion/`, el diseño se rompio.

**Los tres riesgos del port**, cada uno con su test que falla antes de arreglarlo:

| Riesgo | En TypeScript |
|---|---|
| `max(held, key=held.get)` — en empate gana el mas viejo | iterar el `Map` en orden de insercion con `>` **estricto**, nunca `>=` |
| `others[len//10]` — division entera | `Math.floor(n / 10)`; con 8 comparables da indice 0 |
| `zip(rows, rows[1:])` — excluye el tramo actual | `for (let i = 0; i < filas.length - 1; i++)` |

El oraculo es `scripts/validar-casos-contra-original.py`: corre los casos de
`fixtures/rappi/casos/` contra el Python original. **Los 25 chequeos ya dan OK**, asi que los
valores esperados no son una hipotesis.

### `packages/providers` — el contrato y Rappi

```
src/
├── contrato.ts              NUEVO — Proveedor, PoliticasProveedor, ProductoNormalizado
├── cliente-http.ts          NUEVO — ClienteRed | ClienteFixtures | ClienteGrabador
├── registry.ts              NUEVO — id -> Proveedor
└── rappi/
    ├── politicas.ts         faltanteEsSinStock: true, promoKindsExcluidos: ['promo_usuario_nuevo']
    ├── schemas.ts           zod: parsear + validar fixtures + tipar
    ├── index.ts             los 4 pasos, DFS turbo, 3 contexts, walk con duck-test
    └── index.test.ts        contra fixtures/rappi/red/
```

El flujo de 4 pasos esta **verificado en vivo** (ver `.llm-wiki/wiki/bitacora-api.md`), con
`store_id 266872` para el Obelisco y 30 pasillos. `docs/04-contrato-proveedores.md` tiene los
headers exactos.

### Migraciones

| Archivo | Que |
|---|---|
| `0002_catalogo.sql` | `proveedores`, `tiendas`, `productos_canonicos`, `productos` |
| `0003_precios.sql` | `precios_actuales` + `precios_cambios` (append-only) |
| `0004_aplicar_lote.sql` | `private.aplicar_lote_precios()` — changelog + snapshot + set de cambiados |
| `0005_corridas.sql` | `corridas` con `grupos_fallidos`, `app_version` |
| `0006_hallazgos.sql` | `hallazgos`, `alerta_estado`, `notificaciones` |
| `0009_filtros.sql` | `suscripciones.productos_interes text[]` + `ratio_maximo_general numeric` |
| `0010_invitaciones.sql` | `invitaciones(email, invitado_por, usada_at)` + trigger que rechaza el alta |

Las FKs de `direcciones_tiendas.tienda_id` y `suscripciones.tienda_id` se agregan en la 0002,
cuando `tiendas` ya existe.

**Toda tabla nueva lleva RLS y grants en la misma migracion.** Cargá la skill `modelo-de-datos`.

### `apps/crawler`

```
src/
├── corrida.ts           resuelve tiendas con suscripcion activa, recorre, aplica lotes,
│                        guarda del 50% + piso de 100, evalua SOLO los cambiados
├── notificar.ts         fan-out con los filtros de dos niveles + Telegram
├── resolver-tiendas.ts  --lat --lng: crea direccion, tienda y suscripcion
└── probe.ts             captura para fixtures
```

### El fan-out con filtros de dos niveles

```sql
hallazgos nuevos y no cerrados
  join suscripciones s on tienda_id, con la regla en s.reglas_habilitadas
  where (
         -- nivel 1: esta en tu lista
         exists (select 1 from unnest(s.productos_interes) t
                 where p.nombre ilike '%' || t || '%')
         and h.ratio <= s.ratio_maximo
       )
     or h.ratio <= s.ratio_maximo_general   -- nivel 2: red de seguridad
  join canales_notificacion where verificado
  insert into notificaciones on conflict do nothing
```

El `or` es el corazon: la red de seguridad **no depende** de la lista.

### `apps/web` — Next 15

```
app/
├── login/page.tsx       un campo de mail, magic link
├── feed/page.tsx        hallazgos vigentes ordenados por ratio
├── feed/[id]/page.tsx   detalle + grafico SVG de historial
└── api/telegram/webhook/route.ts
```

Server Components por defecto. Todo acceso por `packages/db`. **`service_role` no se importa
nunca** (lint + grep en CI + throw en runtime). Cargá la skill `ui-buscapromos`.

## Alternativas descartadas

| Alternativa | Por que no |
|---|---|
| Filtrar que se scrapea segun la lista del usuario | rompe el historial y el percentil de gondola; ver `00-propuesta.md` |
| Registro abierto | debilita el argumento de uso personal de `docs/11`, y cada direccion nueva es una tienda mas |
| Solo lista, sin red de seguridad | el dueño se perderia lo que olvido anotar — su preocupacion explicita |
| Solo umbral, sin lista | ruido de categorias que no consume |
| Snapshot de precios por corrida | regla de oro 2 y ADR 0004: hace explotar la base |

## Reglas de oro en juego

2 (changelog), 5 (sin stock), 6 (corrida incompleta), 7 (grupo fallido), 10 (registry unico),
11 (la deteccion se persiste), 12 (anti-spam), 13 (RLS), 14 (direcciones son datos personales).

## Riesgos

| Riesgo | Mitigacion |
|---|---|
| El port cambia la semantica en silencio | los 3 tests de los hazards + el oraculo en Python |
| `ilike '%texto%'` matchea de mas ("agua" matchea "aguacate") | aceptable en la 001; si molesta, pasar a busqueda por palabra completa en la 002 |
| Arranque ciego | el feed lo dice explicitamente (E5) |
| `app_version` de Rappi | configurable por env, registrada en `corridas`, runbook en `docs/07` |
