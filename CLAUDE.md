# CLAUDE.md — BuscaPromos

Instrucciones permanentes para Claude Code en este repo. Leé esto antes de tocar nada.

## Que es este proyecto

Detector de promociones reales en Rappi y supermercados argentinos. Recorre catalogos,
guarda el historial de precios, y avisa cuando un producto esta muy por debajo de su
**precio habitual** — no de su precio tachado, que es el que miente.

La usan el dueño, su pareja y amigos/familia. Cada uno carga **sus** direcciones; la
direccion es un dato, nunca una constante del codigo.

**Para ubicarse rapido, antes que `docs/` y que el codigo:** [`.llm-wiki/index.md`](.llm-wiki/index.md)
y [`.llm-wiki/wiki/estado-actual.md`](.llm-wiki/wiki/estado-actual.md) — que esta hecho, que
falta, que esta bloqueado y que `docs/` quedaron desactualizados. Como se mantiene:
[`.llm-wiki/AGENTS.md`](.llm-wiki/AGENTS.md).

Documentacion completa en [`docs/`](docs/). Entrada obligatoria: [`docs/00-vision.md`](docs/00-vision.md)
y [`docs/03-motor-deteccion.md`](docs/03-motor-deteccion.md).

**Cambios medianos o grandes van con spec** en [`specs/`](specs/README.md) (propuesta →
escenarios → diseño → tareas → verificacion → revision adversarial). Comando `/nuevo-cambio`.

## Stack (decidido — ver docs/adr/)

| Capa | Eleccion |
|---|---|
| Web | Next.js 15 (App Router) + TypeScript estricto + Tailwind + shadcn/ui |
| Hosting web | Vercel (solo UI, webhook de Telegram y revalidacion) |
| DB / Auth | Supabase (Postgres, region `sa-east-1` São Paulo), Auth con magic link |
| Mails | Resend (SMTP de Supabase Auth + canal email de alertas) |
| Crawler | TypeScript en GitHub Actions (cron). **No** Vercel Cron: ver ADR 0002 |
| Deteccion | TypeScript en `packages/core`, compartida. **No** Python: ver ADR 0001 |
| Tests | vitest + fast-check |
| Monorepo | npm workspaces |

## Reglas de oro del dominio

Son invariantes. Si un cambio las rompe, el cambio esta mal, no la regla.

1. **No se le cree al precio tachado.** `precio_lista` es un insumo del proveedor, no una
   referencia. La referencia es el historial propio.
2. **El historial propio es la fuente de verdad.** `precios_cambios` es append-only;
   `precios_actuales`, `hallazgos` y todo lo demas es derivado. Si un derivado contradice al
   changelog, el derivado esta mal.
3. **El precio habitual es la moda ponderada por duracion**, no el promedio ni la mediana. El
   precio que estuvo mas tiempo vigente gana. Si no te queda claro por que, leé el caso
   $700 → $1400 (3 dias) → $700 en [`docs/03-motor-deteccion.md`](docs/03-motor-deteccion.md).
4. **Una oferta es "real" solo si el historial lo dice.** Si lleva 7 dias al mismo precio, ese
   es su precio normal: es `inflado`, no una oferta.
5. **Nunca se alerta un producto sin stock**, ni una promo que no le aplica al usuario
   (`promo_usuario_nuevo` de Rappi es para cuentas nuevas: verificado que no aplica a
   cuentas existentes).
6. **Una corrida incompleta no es una corrida.** Si trajo menos del 50% del catalogo conocido
   de la tienda, se descarta entera: no genera alertas, ni "nuevos", ni "desaparecidos".
7. **Un grupo que fallo no marca nada sin stock.** El error de red no es evidencia de que el
   producto no este.
8. **"Desaparecer del catalogo" significa cosas distintas segun el proveedor.** Es una politica
   declarada (`faltanteEsSinStock`), nunca un supuesto en el codigo. En Rappi desaparecer es
   sin stock; los supermercados dejan el producto listado como agotado.
9. **No existe producto sin proveedor.** Toda fila de precio pertenece a un
   `(proveedor, tienda, producto)`. Nunca una PK `(tienda, producto)` a secas.
10. **Una regla existe en un solo lugar: el registry** (`packages/core/src/reglas/registry.ts`).
    Si una clave de regla, su titulo o su umbral esta escrito dos veces, esta mal.
11. **La deteccion se calcula una vez, en el crawler, y se persiste.** La web lee `hallazgos`;
    no recalcula nada. Si la UI necesita un numero, es una columna.
12. **Se alerta cuando algo nuevo pasa, no cuando algo sigue pasando.** Re-alertar solo si bajo
    mas de `realertar_si_baja` (5%) respecto del ultimo aviso.
13. **Un usuario solo ve datos de las tiendas a las que esta suscripto**, y eso lo garantiza
    RLS, no un `where` en el cliente.
14. **Las direcciones de los usuarios son datos personales.** Nunca en el repo, nunca en logs,
    nunca en artifacts de Actions. El repo es publico.
15. **No se comparan precios cross-tienda sobre identidad dudosa.** Solo las claves canonicas
    de origen `ean` o `rappi_master` habilitan `vs_otras_tiendas`. Un match por nombre genera
    la peor clase de falso positivo: convincente.
16. **Volumen bajo y con delays.** Esto es de uso personal. No somos un competidor ni
    revendemos datos. Ver [`docs/11-legal-y-tos.md`](docs/11-legal-y-tos.md).

## Convenciones de codigo

- **Todo en castellano**: commits, docs, comentarios, nombres de tablas y columnas. Sin tildes
  en identificadores (`precios_cambios`, no `precios_cámbios`). snake_case en la DB,
  camelCase en TS.
- Tiempo en el core: **epoch en segundos** (`number`), con el reloj inyectado (`ahora: number`)
  para que los tests sean deterministas. La DB usa `timestamptz`; la conversion vive en
  `packages/db` y en ningun otro lado.
- Acceso a datos: **siempre** por las funciones de `packages/db`, nunca `supabase.from()` suelto
  en un componente o en el crawler.
- Server Components por defecto; `'use client'` solo donde haya interaccion real.
- Toda tabla nueva en `public` lleva **RLS y `grant` explicitos en la misma migracion**
  (`anon`, `authenticated`, `service_role`). Supabase no los da solos.
- Las funciones internas viven en el schema `private`: PostgREST expone como endpoint REST
  todo lo que esta en `public`.

## Comandos

```bash
npm run verificar        # gate de pre-push: typecheck + lint + test + reglas + fixtures
npm run test             # vitest run
npm run corrida:offline  # corrida completa con deteccion, contra fixtures, sin red
npm run dev              # web local

npm run db:arrancar      # Postgres local en Docker (no sale a internet)
npm run db:reset         # recrea la DB local, aplica migraciones + seed
npm run db:tipos         # regenera packages/db/src/tipos.ts desde el esquema

npm run probe            # pega a la API real (solo corre en Actions: ver docs/09)
npm run corrida          # corrida real contra la DB (solo Actions)
npm run notificar        # fan-out de hallazgos a Telegram
```

## Skills disponibles (`.claude/skills/`)

De dominio — si la tarea cae en uno de estos rubros, cargá la skill antes de escribir codigo:

- `motor-deteccion` — las 7 reglas, los invariantes del algoritmo, como agregar una regla.
- `proveedor-nuevo` — cumplir el contrato de `Proveedor`, sus politicas y sus fixtures.
- `modelo-de-datos` — escribir una migracion con RLS y grants.
- `fixtures-y-probe` — capturar, redactar, promover y usar fixtures.
- `alertas-telegram` — las 5 capas de anti-spam y el formato del mensaje.
- `ui-buscapromos` — el sistema visual, el feed, mobile-first.

De proceso:

- `refinar-pedido` — convertir un pedido vago en implementable, antes de la spec.
- `revision-adversarial` — tratar de romper un cambio antes de cerrarlo.
- `verificar-antes-de-cerrar` — la checklist de `04-verificacion.md`.

Del plugin **Superpowers** (habilitado): `brainstorming`, `writing-plans`, `executing-plans`,
`test-driven-development`, `systematic-debugging`, `subagent-driven-development`,
`requesting-code-review`, `receiving-code-review`, `verification-before-completion`,
`using-git-worktrees`, `finishing-a-development-branch`. No los reimplementes localmente.

`revision-adversarial` es **obligatoria** si el cambio toca umbrales o logica de reglas, el
anti-spam, auth/RLS, o datos personales. Mejor en otra sesion que la que implemento.

## Flujo de cambios

1. Branch nueva desde `main` (nunca commitear directo en `main`).
2. Editar, correr `npm run verificar`, probar con `npm run corrida:offline`.
3. Commit con mensaje en castellano, push, Pull Request. El dueño revisa y mergea.
4. Un tema por commit/PR.

## Que NO hacer

- No usar `supabase.from()` en un componente ni en el crawler. Todo por `packages/db`.
- **No importar el cliente `service_role` desde `apps/web`. Nunca.** Es el bug de una linea
  que expone la base entera.
- No agregar un snapshot de precios por corrida "para que sea mas facil consultar". Rompe la
  regla de oro 2 y hace explotar la base.
- No "arreglar" el `else if` entre `descuento_extremo` y `gran_descuento`: son mutuamente
  excluyentes a proposito.
- No "arreglar" el `Math.floor(others.length / 10)` ni el descarte de las unidades "Und" en el
  parser de presentacion. Los dos son intencionales y estan documentados.
- No reimplementar la mediana, `estadoOferta` ni el parser de presentacion en el front.
- No habilitar `vs_otras_tiendas` con matching por nombre sin una spec que mida precision.
- No commitear fixtures sin pasar por `scripts/redactar.ts`, ni capturas crudas de `probes/`.
- No subir el umbral de la guarda del 50% porque "una corrida se descarto".
- No meter logica de negocio en una migracion. La DB hace integridad; el dominio vive en
  `packages/core`.
- No agregar un proveedor sin su archivo de politicas y sus fixtures.
- No commitear `.env*`, direcciones, coordenadas reales, tokens ni `chat_id` de Telegram.
  **El repo es publico.**

## Si la API de Rappi falla

Primer sospechoso: `app_version` (hoy `web_v1.223.2`). Se saca de rappi.com.ar con DevTools →
Network → cualquier request a `services.rappi.com.ar` → header `app-version`. Queda registrado
por corrida en `corridas.app_version`, y la historia de roturas en
[`.llm-wiki/wiki/bitacora-api.md`](.llm-wiki/wiki/bitacora-api.md). Runbook completo en
[`docs/07-operacion.md`](docs/07-operacion.md).
