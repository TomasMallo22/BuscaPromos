# ADR 0001 — TypeScript para el motor de deteccion

- **Fecha:** 2026-10-07
- **Estado:** aceptada

## Contexto

El motor original esta en Python (stdlib puro). Mantenerlo en Python y escribir la web en
TypeScript es una opcion valida y evita el riesgo de portar un algoritmo sutil.

El argumento "compartir el paquete con la web" es mas debil de lo que parece y conviene decirlo:
**la web no recalcula nada.** El front del repo original reimplemento `offer_status` y la mediana
en JavaScript porque su backend exportaba un JSON estatico sin los campos derivados. Con Postgres,
el crawler escribe `hallazgos` con `precio_referencia`, `ratio` y `estado_oferta` ya calculados.
Eso ya elimina la duplicacion, en cualquier lenguaje.

## Decision

El motor de deteccion se porta a **TypeScript** y vive en `packages/core`, compartido entre el
crawler y la web.

## Consecuencias

**A favor:**

1. **Un solo `typecheck`.** El limite scraper↔DB↔UI es donde se cuelan los bugs. Con los tipos
   generados por `supabase gen types typescript`, un cambio de columna rompe la compilacion de
   los tres a la vez.
2. **El dueño mantiene esto solo.** Dos toolchains (ruff/pytest/mypy + eslint/vitest/tsc) es el
   doble de CI, el doble de skills y el doble de "¿como corro los tests?".
3. **Los zod schemas de cada proveedor sirven tres veces**: parsear la respuesta real, validar
   que el fixture no se podrio, y tipar. En Python serian pydantic mas una copia en TS.
4. El activo intelectual son ~150 lineas de algoritmo, no 1060. El resto (HTTP, SQLite, CLI) se
   reescribe igual.

**En contra, con nombre y apellido.** Tres semanticas de Python que **no** se traducen literal.
Cada una necesita un test que falle antes de arreglarla:

- `max(held, key=held.get)` — los dicts de Python preservan orden de insercion, asi que en
  empate gana el precio insertado primero (el mas viejo). En TS: iterar un `Map` en orden de
  insercion con `>` **estricto**, nunca `>=`.
- `others[len(others)//10]` — division entera hacia abajo. `Math.floor(n/10)`; con 8 comparables
  da indice 0. Es intencional y se documenta, no se "arregla".
- `zip(rows, rows[1:])` — excluye a proposito el tramo actual. Un off-by-one aca mete el precio
  de oferta en el calculo del precio habitual y rompe todo **en silencio**.

**Mitigacion:** portar primero los tests del original (incluido el adversarial
$700 → $1400 → $700 = `inflado`), que fallen, y despues el codigo. Es
`superpowers:test-driven-development` aplicado literal.

El tiempo en el core es epoch en segundos (`number`), igual que el original, para que los tests
transfieran 1:1 y el reloj sea inyectable.
