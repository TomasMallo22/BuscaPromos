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

## Falta (spec 000)

- `packages/*` y `apps/*` con su `package.json` y `tsconfig.json`.
- eslint + las dos lint rules propias (`no-clave-regla-literal`, `no-service-role-en-web`).
- Proyecto Supabase en `sa-east-1` + migraciones 0001, 0007, 0008 + `db:tipos`.
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
