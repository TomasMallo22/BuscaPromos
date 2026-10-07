# ADR 0010 — Fixtures grabados y un workflow probe

- **Fecha:** 2026-10-07
- **Estado:** aceptada

## Contexto

La red del contenedor de desarrollo esta cerrada: verificado el 2026-10-07, todos los hosts
objetivo devuelven codigo 000. El campo "Allowed domains" del entorno rechaza los dominios
`.com.ar` por un limite de su validador.

## Decision

Los clientes de cada proveedor se desarrollan y testean contra **fixtures grabados**, a traves
de una interfaz `ClienteHttp` con tres implementaciones (red, fixtures, grabador). La captura de
fixtures reales se hace con un workflow `probe` en Actions.

## Consecuencias

**El esquema se construye igual aunque el bloqueo se resuelva**, por tres razones que no
desaparecen:

1. **Los tests no pueden depender de que Rappi este arriba.** Un CI que falla por motivos que no
   son el codigo es un generador de ruido que se termina ignorando.
2. **La IP del contenedor no es la de Actions.** El veredicto "Rappi no bloquea IPs de
   datacenter de Actions" vale para Actions. La validacion real pasa por ahi de todos modos.
3. **El fixture es documentacion ejecutable.** Cuando Rappi cambie el layout en seis meses, el
   diff entre el fixture viejo y la captura nueva dice **exactamente** que campo se movio. Eso
   es lo que va a `.llm-wiki/wiki/bitacora-api.md` como evidencia.

**A favor, ademas:** con `ClienteFixtures` los tests de parsing son **integracion real sin red**
— ejercitan el flujo de 4 pasos completo, el walk recursivo, la paginacion y la normalizacion.

**En contra:** los fixtures se podren. Mitigado con `fixtures:verificar` en CI (revalida contra
el zod schema y el `sha256`) y con `capturado_at` + `app_version` en el manifest, que fechan la
evidencia.

**La seguridad del probe no es negociable:** redactar y verificar son **dos pasos separados**,
escritos con criterios distintos, y `redactar:verificar` falla el job si encuentra algo que
parezca un JWT, un `Bearer`, un `x-guest-api-key` o el `deviceid`. Si el mismo codigo redacta y
verifica, un bug pasa desapercibido y un token llega a un artifact publico.
