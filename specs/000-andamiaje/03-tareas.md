# 000 — Andamiaje SDD + esqueleto · Tareas

| # | Tarea | Red | Estado |
|---|---|---|---|
| 1 | Clonar `ivokalaizic/rappi-turbo-radar` y leer el core | github | ✅ |
| 2 | `CLAUDE.md` con las 16 reglas de oro y el "que NO hacer" | no | ✅ |
| 3 | `.llm-wiki/`: index, AGENTS, estado-actual, bloqueos, fuentes, bitacora | no | ✅ |
| 4 | `.gitignore`, `.env.example`, `package.json` (workspaces), `tsconfig.base.json`, `vitest.workspace.ts` | no | ✅ |
| 5 | `docs/00` a `docs/11` + `docs/14` | no | ✅ |
| 6 | `docs/adr/0001` a `0011` | no | ✅ |
| 7 | `specs/README.md` + `_plantilla/` con los 6 archivos | no | ✅ |
| 8 | Las 9 skills de `.claude/skills/` | no | ✅ |
| 9 | Los 5 commands de `.claude/commands/` | no | ✅ |
| 10 | `package.json` + `tsconfig.json` de cada workspace | no | ✅ |
| 11 | eslint + las 2 lint rules propias | no | ✅ |
| 12 | `.github/workflows/ci.yml` | no | ✅ |
| 13 | Migracion 0001 (enums) | no | ✅ |
| 13b | Proyecto Supabase `sa-east-1` + migraciones 0007 y 0008 aplicadas | no | ✅ |
| 13c | `get_advisors` de seguridad limpio | no | ✅ |
| 14 | `npm run db:tipos` → `packages/db/src/tipos.ts` | no | ✅ |
| 14b | Tests de RLS con dos JWT reales | no | ⏳ |
| 15 | Next 15 mobile-first: `/login` con magic link, `/feed` vacio, `/ajustes` | no | ⏳ |
| 16 | SMTP de Resend en Supabase Auth | — | ⏳ dueño |
| 17 | Deploy a Vercel y probar el login desde el celular | — | ⏳ dueño |
| 18 | Actualizar `.llm-wiki/wiki/estado-actual.md` | no | ✅ |
| 19 | Casos sinteticos de `fixtures/rappi/casos/`, validados contra el original | no | ✅ |

## Sin red (todo lo de arriba menos 16 y 17)

**Nada de esta spec necesita la red bloqueada.** `supabase start` es docker local y no sale a
internet; `npm` y `pypi` estan en el `noProxy`. El bloqueo B1 no frena la 000: frena la 001.

## Con red

Solo el deploy a Vercel (que corre del lado de Vercel, no de este contenedor) y la
configuracion de Resend, que son dos cosas que hace el dueño en una interfaz web.

## Orden de los tests

No hay motor de deteccion en esta spec, asi que no hay TDD de dominio. Lo que si hay:

- Los tests de RLS de la migracion 0008, **con dos JWT reales**. Son los primeros tests del
  repo y establecen el patron para todas las specs que toquen RLS.
- `reglas:verificar` y `fixtures:verificar` existen como scripts aunque todavia no haya reglas
  ni fixtures que verificar: si se agregan despues, nadie se acuerda de agregarlos a CI.
