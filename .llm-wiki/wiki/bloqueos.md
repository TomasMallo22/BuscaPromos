# Bloqueos

_Ultima actualizacion: 2026-10-07_

## B1 — Los subdominios siguen bloqueados

**Estado: abierto, acotado.** El dueño cargo los dominios en modo Personalizado. Medido con
`curl` el 2026-10-07, la lista hace **match exacto con el hostname y no cubre subdominios**:

```
rappi.com.ar   301 ok      services.rappi.com.ar  000 bloqueado   <- la API de Rappi
jumbo.com.ar   301 ok      www.jumbo.com.ar       000 bloqueado
                           api.telegram.org       000 bloqueado
```

Como **todos** los endpoints del proyecto son subdominios, faltan cargarlos con el comodin que
el propio campo documenta (`*`): `*.rappi.com.ar`, `*.jumbo.com.ar`, `*.disco.com.ar`,
`*.vea.com.ar`, `*.carrefour.com.ar`, `*.supermercadosdia.com.ar`, `*.masonline.com.ar`,
`*.telegram.org`, `*.cnstrc.com`, `*.laanonima.com.ar`, `*.cloudfront.net`,
`*.produccion.gob.ar`. Si el comodin no funcionara, van los hostnames exactos.

**No frena la spec 000.** Frena la 001, donde hay que pegarle a la API de Rappi. Mientras
tanto el workflow `probe` de Actions captura las respuestas reales: ver
`docs/09-fixtures-y-probe.md`.

## B2 — SMTP de Supabase Auth limitado

**Estado: abierto, con solucion conocida.** El SMTP interno de Supabase esta limitado a ~2
emails por hora en el plan free. Con 6-10 usuarios haciendo magic link se agota el primer dia.

**Solucion:** configurar SMTP propio con Resend (free tier 3.000 mails/mes) desde la spec 000.
El dueño ya usa Resend en CirculoAjedrezBeccar. La misma cuenta cubre despues el canal email
de alertas, asi que no es una integracion nueva.

## B3 — El repo es privado — RESUELTO 2026-10-07

**Estado: cerrado.** El repo es publico (`visibility: public`, responde 200 sin autenticacion),
asi que Actions tiene minutos ilimitados y la cadencia del cron es libre. Se deja la nota de
abajo por el contexto de la decision; ver ADR 0008. `TomasMallo22/BuscaPromos` esta privado: 2.000 min/mes en el
plan free, y Actions factura redondeando hacia arriba por minuto y por job. Con corridas de
~3 min, una cadencia de 30 minutos son ~4.320 min/mes: no entra.

**Decision tomada:** repo publico, que da minutos ilimitados. El costo es exposicion de ToS
(el repo dice en voz alta que scrapeamos), no de privacidad: no hay ni un dato personal en el
repo por construccion. Ver ADR 0008 y `docs/11-legal-y-tos.md`.

**Mientras siga privado:** cron horario de 07:00 a 23:00 ART (~480 runs = ~1.440 min/mes), que
entra en el free tier con margen para CI.
