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
- **La red del contenedor esta abierta y el flujo de 4 pasos de Rappi se verifico en vivo**:
  auth de invitado, resolucion de tienda por lat/lng (store 266872 en el Obelisco), 30 pasillos,
  sub-pasillos con `product_count`, y productos con los 10 campos clave, ninguno faltante.
  Detalle con numeros en `bitacora-api.md`. Rappi pasa de MEDIO a **FACIL** y **no necesita
  Playwright**.
- **Branch `main` creada** (2026-10-07) y es la base de los PRs. Antes el unico branch era
  `claude/festive-heisenberg-xvs0r9`.
- **`apps/web` existe** (2026-10-07): Next 15 mobile-first con `/login` por invitacion (magic
  link con `token_hash`, que se puede abrir en otro dispositivo), `/auth/confirm`, `/feed` con
  los dos primeros estados vacios de `docs/14`, y `/ajustes` de solo lectura. Probado contra el
  Supabase real: un mail sin invitacion rebota con mensaje claro y **no** crea usuario (E15 de
  la 001). El login completo, con mail de verdad, **todavia no se probo**: espera el SMTP y
  Vercel. Las plantillas de mail estan en `supabase/plantillas/`.
- **Dominio `httpsolutions.dev` verificado en Resend** (2026-10-07, region São Paulo, DNS en
  Cloudflare).

## Falta (spec 000)

- Tests de RLS **con dos JWT reales de dos usuarios distintos** (nunca `service_role`).
- Cargar el SMTP de Resend en Supabase Auth y apagar el registro abierto (dueño).
- Deploy a Vercel y probar el login desde el celular (dueño). Paso a paso en
  `docs/07-operacion.md`, seccion "Supabase Auth".
- `ci.yml` verde.

## Spec 001 — especificada y lista para ejecutar

`specs/001-rappi-end-to-end/` tiene los 5 archivos completos: propuesta con las decisiones del
dueño (registro por invitacion, filtros de dos niveles), 19 escenarios, diseño con el arbol de
archivos y las migraciones, 26 tareas en orden, y la verificacion escenario por escenario.

**Se puede ejecutar desde una sesion local**: ver `docs/12-trabajar-en-local.md`.

## Lo que sigue

Ejecutar la spec 001, empezando por las tareas 1 a 7: el motor de deteccion en
`packages/core`, con los tests primero. Es el activo intelectual, no depende de la base ni de
la red, y sus valores esperados ya estan validados contra el Python original.

## Esperando al dueño

| Que | Para que | Estado |
|---|---|---|
| SMTP de Resend en Supabase + "Allow new users to sign up" apagado | Que el magic link llegue y que nadie se registre solo | pendiente |
| Proyecto en Vercel (Root Directory `apps/web`) + URLs y plantillas en Supabase Auth | La primera prueba desde el celular | pendiente |
| Decidir licencia del repo al ser publico | Legal | pendiente |
| Avisarle a Ivo que se porta su logica | Cortesia | pendiente |
| Cuantas direcciones realistas | Dimensionar `tiendas` y el presupuesto de minutos | pendiente |
