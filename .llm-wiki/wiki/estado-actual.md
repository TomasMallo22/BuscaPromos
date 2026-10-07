# Estado actual

_Ultima actualizacion: 2026-10-07_

## Donde estamos

**Spec 000 (andamiaje) en curso.** El repo tenia cero commits; se esta creando la estructura
SDD, la configuracion del monorepo y la documentacion base. Todavia no hay codigo que corra.

## Hecho

- Investigacion de factibilidad de las 7 fuentes candidatas → `wiki/fuentes.md`.
- Lectura completa del core de `ivokalaizic/rappi-turbo-radar` (clonado en
  `/home/user/ivokalaizic/rappi-turbo-radar`, 1.140 lineas de Python). El algoritmo de
  deteccion esta documentado en `docs/03-motor-deteccion.md`.
- Decisiones de arquitectura cerradas → los 11 ADRs en `docs/adr/`.
- `CLAUDE.md` con las 16 reglas de oro del dominio.
- Estructura de carpetas, `package.json` con workspaces, `tsconfig.base.json` estricto.
- Los 11 ADRs, `docs/00` a `docs/11` y `docs/14`.
- `specs/README.md` con el ciclo de vida de 6 pasos y `specs/_plantilla/`.
- Las 9 skills de `.claude/skills/` (6 de dominio, 3 de proceso) y los 5 commands.
- `.github/workflows/ci.yml` con los chequeos estructurales del nivel 4.
- **Los 7 casos sinteticos de `fixtures/rappi/casos/`, validados contra la implementacion
  original en Python** con `scripts/validar-casos-contra-original.py`. Los valores esperados no
  son lo que nosotros creemos: son lo que devuelve el algoritmo de referencia.
- `npm run verificar` **corre y da verde**: typecheck, eslint con las dos lint rules propias,
  10 tests, `reglas:verificar` y `fixtures:verificar`.
- Migracion `0001_enums_y_schemas.sql` con el schema `private` y los 7 enums del dominio.
- `packages/core/src/tipos.ts` con los tipos del dominio y un test que verifica que **no se
  desincronicen del SQL** (probado: agregar un valor al enum rompe el test).
- Los dos scripts de verificacion estructural, **probados con casos negativos**: la deriva
  registry/enum en los dos sentidos, filas fuera de orden cronologico, campos faltantes y
  tokens dentro de un fixture.

- **Proyecto Supabase creado y las tres migraciones aplicadas.** Proyecto `buscapromos`,
  ref `yqfupeqgjibtfvgazvqw`, region `sa-east-1`, organizacion `httpsolutions`. Las 5 tablas
  existen y **todas tienen RLS habilitado**; `get_advisors` de seguridad da **cero hallazgos**.
- `packages/db/src/tipos.ts` generado desde el esquema real.
- **El repo ya es publico**: Actions con minutos ilimitados, cadencia del cron libre.

## Falta (spec 000)

- Tests de RLS **con dos JWT reales de dos usuarios distintos** (nunca `service_role`).
- Next 15 mobile-first: `/login` con magic link, `/feed` vacio, `/ajustes`.
- Next 15 mobile-first en Vercel: `/login` con magic link, `/feed` vacio, `/ajustes`.
- SMTP de Resend en Supabase Auth (sin esto el login se rompe con 3 usuarios: ver `bloqueos.md`).
- `ci.yml` verde.

## Lo que sigue

Spec 001 — Rappi end-to-end. El orden importa porque la red esta bloqueada (ver `bloqueos.md`):
se puede hacer ~65% sin red, empezando por `packages/core` y los casos sinteticos de
`fixtures/rappi/casos/`.

## Esperando al dueño

| Que | Para que | Estado |
|---|---|---|
| Subir el nivel de acceso de red del entorno | Poder iterar contra la API real | pendiente |
| Pasar el repo de privado a publico | Minutos de Actions ilimitados | pendiente |
| Decidir licencia del repo al ser publico | Legal | pendiente |
| Avisarle a Ivo que se porta su logica | Cortesia | pendiente |
| Cuantas direcciones realistas | Dimensionar `tiendas` y el presupuesto de minutos | pendiente |
