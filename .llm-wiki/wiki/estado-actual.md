# Estado actual

_Ultima actualizacion: 2026-10-07_

## Donde estamos

**Spec 000 (andamiaje)**: casi cerrada; lo que falta depende del dueño (Vercel, Resend) o de
la base local (tests de RLS). **Spec 001**: el motor de deteccion en `packages/core` esta hecho
y probado (tareas 1 a 7). Sigue la base de datos (tarea 8 en adelante).

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

## Falta (spec 000)

- Tests de RLS **con dos JWT reales de dos usuarios distintos** (nunca `service_role`).
- Next 15 mobile-first: `/login` con magic link, `/feed` vacio, `/ajustes`.
- Next 15 mobile-first en Vercel: `/login` con magic link, `/feed` vacio, `/ajustes`.
- SMTP de Resend en Supabase Auth (sin esto el login se rompe con 3 usuarios: ver `bloqueos.md`).
- `ci.yml` verde.

## Spec 001 — en curso: el motor esta hecho (tareas 1 a 7)

`specs/001-rappi-end-to-end/` tiene los 5 archivos completos: propuesta con las decisiones del
dueño (registro por invitacion, filtros de dos niveles), 19 escenarios, diseño con el arbol de
archivos y las migraciones, 26 tareas en orden, y la verificacion escenario por escenario.

**El motor de deteccion existe y esta probado** (2026-10-07). En `packages/core/src/`:

- `reglas/registry.ts` — las 7 reglas: clave, umbral, titulo, emoji, orden y `evaluar`. Mas
  `PARAMETROS` y `UMBRALES_DEFAULT`. `reglas:verificar` compara contra el enum real, probado
  con deriva en los dos sentidos.
- `normalizacion/presentacion.ts`, `deteccion/precio-habitual.ts`, `estado-oferta.ts`,
  `pasillo.ts` y `motor.ts` (`evaluarReglas`, con los dos cortes y el `else if`).
- **124 tests**, incluidos los 7 casos de `fixtures/rappi/casos/` leidos del JSON. Cada valor
  esperado escrito a mano se contrasto contra el Python original antes de implementar, y
  cada hazard (`>` estricto, tramo actual excluido, ventana en `desde`, `floor(n/10)`, el
  `else if`, `gran_descuento` exige `real`) tiene un mutante que hace fallar los tests.
- El oraculo (`scripts/validar-casos-contra-original.py`) da 28 chequeos OK.

Dos diferencias deliberadas con el original, las dos con test: el corte por sin stock vive
en `evaluarReglas` (en el original estaba en `evaluate`), y la tabla de unidades del parser es
un `Map` (con un objeto, `'1 X 5 constructor'` tiraba `TypeError`).

**Se puede ejecutar desde una sesion local**: ver `docs/12-trabajar-en-local.md`.

## Lo que sigue

Spec 001 desde la tarea 8: las migraciones 0002 a 0006, 0009 y 0010, y despues
`packages/db`. Cargar la skill `modelo-de-datos`.

**La revision adversarial del motor esta pendiente** y es obligatoria (toca logica de
reglas). Mejor en otra sesion que la que lo implemento.

## Esperando al dueño

| Que | Para que | Estado |
|---|---|---|
| Subir el nivel de acceso de red del entorno | Poder iterar contra la API real | pendiente |
| Pasar el repo de privado a publico | Minutos de Actions ilimitados | pendiente |
| Decidir licencia del repo al ser publico | Legal | pendiente |
| Avisarle a Ivo que se porta su logica | Cortesia | pendiente |
| Cuantas direcciones realistas | Dimensionar `tiendas` y el presupuesto de minutos | pendiente |
| ¿`caida_vs_historial` con 2 dias de historia esta bien? | Ver `docs-desactualizados.md`: el E5 de la spec 001 dice que no puede pasar, el original lo hace | pendiente |
