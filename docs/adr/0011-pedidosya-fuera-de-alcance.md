# ADR 0011 — PedidosYa queda fuera de alcance

- **Fecha:** 2026-10-07
- **Estado:** aceptada

## Contexto

El dueño pidio explicitamente PedidosYa junto con Rappi. Su API interna tiene campos de precio
excelentes para este caso de uso: `pricing.price`, `pricing.beforePrice` (el tachado),
`campaigns[]` con tipo, configuracion y tope de la promo.

El problema es el acceso. PedidosYa esta protegido por **PerimeterX** (HUMAN Security):
devuelve 403 con captcha a requests HTTP directos, y **bloquea IPs de datacenter**. Proyectos
open source que lo scrapean reportan que su CI en GitHub Actions esta deshabilitado por eso y
corren desde una maquina local.

## Decision

**No se implementa PedidosYa.** Decision del dueño, 2026-10-07.

## Consecuencias

Lo que haria falta: Playwright con stealth, **mas** una IP residencial (proxy pago o un runner
self-hosted en la casa del dueño). Seria la pieza mas fragil del sistema, la unica con costo
recurrente, la unica que no corre en la nube gratis, y la que mas mantenimiento pediria.

**Y hay una razon que no es tecnica**: esquivar un sistema anti-bot con stealth e IP residencial
es pasar de "leer un endpoint publico" a "evadir una defensa". Es otra cosa, y es la linea que
este proyecto no cruza. Ver [`../11-legal-y-tos.md`](../11-legal-y-tos.md).

**Que se hace en cambio:** priorizar los proveedores VTEX (spec 004), que son tecnicamente
FACILES — API publica sin auth, sin anti-bot — y cubren Jumbo, Disco, Vea, Carrefour, Dia y
ChangoMas. Mas cobertura real por mucho menos esfuerzo y sin fragilidad.

**Si alguna vez se retoma**, seria con el runner self-hosted de la casa del dueño, nunca en la
nube. Este ADR existe para no re-discutirlo cada tres meses.
