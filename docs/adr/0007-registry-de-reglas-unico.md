# ADR 0007 — Una regla se define en un solo lugar

- **Fecha:** 2026-10-07
- **Estado:** aceptada

## Contexto

En el repo original, `'caida_vs_historial'` esta escrito como string literal en cinco lugares:
`DEFAULT_RULES`, `check()`, la columna `alerts.rule`, `notify.TITLES`, `config.example.json` y
el HTML del front. Agregar una regla toca cinco archivos; renombrarla rompe el historial de
`alert_state` en silencio.

## Decision

`packages/core/src/reglas/registry.ts` es la **unica** definicion de una regla: clave, umbral
default, titulo, emoji, orden de prioridad y funcion de evaluacion. El enum `regla_clave` de
Postgres se genera desde ahi y `npm run reglas:verificar` falla en CI si hay deriva.

## Consecuencias

Una regla nueva se agrega en un archivo. Los titulos de Telegram, los chips de la UI y los
defaults de `suscripciones.reglas_habilitadas` salen del registry.

Dos mecanismos lo sostienen:

- `npm run reglas:verificar` compara `Object.keys(REGISTRY)` contra
  `select enum_range(null::regla_clave)`.
- Una lint rule `no-clave-regla-literal` prohibe literales como `'caida_vs_historial'` fuera de
  `packages/core/src/reglas/`.

**En contra:** el enum de Postgres y el registry pueden desincronizarse entre el momento en que
se agrega la regla y el momento en que se escribe la migracion. El check en CI convierte eso en
un fallo ruidoso en vez de un bug silencioso, que es lo mejor que se puede pedir.

La estructura de `check()` se preserva literal: los dos cortes tempranos, y
`descuento_extremo` **XOR** `gran_descuento` como `if/else if`, con un comentario que diga que
el `else` es intencional. Es el tipo de cosa que un refactor bienintencionado rompe.
