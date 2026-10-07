# ADR 0008 — Repo publico, cadencia libre

- **Fecha:** 2026-10-07
- **Estado:** aceptada

## Contexto

GitHub Actions es gratis e **ilimitado** en repos publicos. En privado son 2.000 min/mes,
facturados redondeando hacia arriba por minuto y por job: con corridas de ~3 minutos, una
cadencia de 30 minutos son ~4.320 min/mes y no entra. Privado obligaria a cron horario de
07 a 23 (~1.440 min/mes) o a pagar del orden de USD 40/mes.

## Decision

`TomasMallo22/BuscaPromos` pasa a **publico**. Decision del dueño, 2026-10-07.

## Consecuencias

**A favor:** minutos ilimitados, cadencia libre de 15 a 30 minutos, y las sesiones en la nube y
los PRs tienen CI gratis.

**La tension privacidad/publico se resuelve por diseño, no por confianza.** El repo **no
contiene ni un dato personal**: las direcciones, los `chat_id` y los emails viven en Supabase con
RLS; los tokens en secrets; las capturas crudas en `probes/`, que esta en `.gitignore`; los
fixtures redactados y verificados por dos pasos distintos. A diferencia del repo original, que
commiteaba la SQLite, aca no hay nada sensible que se pueda filtrar por descuido.

**Lo que si queda expuesto es el metodo**: el repo dice en voz alta que scrapeamos Rappi. Eso es
exposicion de **ToS**, no de privacidad. Es el costo aceptado, documentado en
[`../11-legal-y-tos.md`](../11-legal-y-tos.md).

**Consecuencia operativa:** los logs de Actions de un repo publico son publicos. Todo workflow
que toque direcciones las enmascara con `::add-mask::`.

Es reversible: volver a privado solo obliga a bajar la cadencia.
