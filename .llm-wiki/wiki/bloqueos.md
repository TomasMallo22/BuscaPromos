# Bloqueos

_Ultima actualizacion: 2026-10-07_

## B1 — La red del contenedor de desarrollo esta cerrada

**Estado: abierto.** Verificado con `curl` el 2026-10-07: todos los hosts objetivo devuelven
codigo 000 (el gateway del proxy rechaza el CONNECT con 403).

```
services.rappi.com.ar      000     datos.produccion.gob.ar   000
www.jumbo.com.ar           000     ac.cnstrc.com             000
www.carrefour.com.ar       000     api.laanonima.com.ar      000
api.telegram.org           000     github.com                 ok   <- control
```

`registry.npmjs.org` y `pypi.org` estan en el `noProxy`, asi que instalar dependencias funciona.
La misma politica bloquea 18 servidores MCP de los plugins `design` y `marketing`.

**El campo "Allowed domains" del entorno no sirve acá**: su validador pide formato `example.com`
o `.example.com` y rechaza los dominios argentinos, que tienen tres etiquetas
(`rappi.com.ar`, `jumbo.com.ar`). Verificado por el dueño, falla con y sin `www.`.

**Salida elegida:** subir el nivel de acceso de red del entorno (menu del entorno → Edit →
Network access), que no requiere lista de dominios.

**Mitigacion mientras siga abierto:** el workflow `probe` de Actions captura las respuestas
reales y las sube como artifact; esas capturas, redactadas, son los fixtures. Se construye
igual aunque el bloqueo se resuelva, porque los tests no pueden depender de que Rappi este
arriba y la IP del contenedor no es la de Actions. Ver `docs/09-fixtures-y-probe.md`.

## B2 — SMTP de Supabase Auth limitado

**Estado: abierto, con solucion conocida.** El SMTP interno de Supabase esta limitado a ~2
emails por hora en el plan free. Con 6-10 usuarios haciendo magic link se agota el primer dia.

**Solucion:** configurar SMTP propio con Resend (free tier 3.000 mails/mes) desde la spec 000.
El dueño ya usa Resend en CirculoAjedrezBeccar. La misma cuenta cubre despues el canal email
de alertas, asi que no es una integracion nueva.

## B3 — El repo es privado y el cron necesita minutos

**Estado: esperando al dueño.** `TomasMallo22/BuscaPromos` esta privado: 2.000 min/mes en el
plan free, y Actions factura redondeando hacia arriba por minuto y por job. Con corridas de
~3 min, una cadencia de 30 minutos son ~4.320 min/mes: no entra.

**Decision tomada:** repo publico, que da minutos ilimitados. El costo es exposicion de ToS
(el repo dice en voz alta que scrapeamos), no de privacidad: no hay ni un dato personal en el
repo por construccion. Ver ADR 0008 y `docs/11-legal-y-tos.md`.

**Mientras siga privado:** cron horario de 07:00 a 23:00 ART (~480 runs = ~1.440 min/mes), que
entra en el free tier con margen para CI.
