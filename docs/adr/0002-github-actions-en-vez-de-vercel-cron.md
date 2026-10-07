# ADR 0002 — GitHub Actions en vez de Vercel Cron

- **Fecha:** 2026-10-07
- **Estado:** aceptada

## Contexto

El dueño quiere la web en Vercel, asi que Vercel Cron es el candidato obvio: menos piezas, un
solo proveedor.

## Decision

El crawler, la deteccion y la notificacion corren en **GitHub Actions** por cron. Vercel se
queda con la UI, el webhook de Telegram y la revalidacion.

## Consecuencias

**Por que no entra en Vercel Cron:** en el plan Hobby el cron minimo es **una vez por dia** y
la duracion maxima de funcion es **60 segundos**. Una corrida de Rappi son ~120 requests
paginados (6000 productos / 50) mas el arbol de pasillos, con delay entre medio: **2 a 4
minutos**.

Hacerlo entrar requiere partirlo en ~100 invocaciones encadenadas con una cola y estado
intermedio. Esa es exactamente la complejidad que el requisito "que sea sencillo" prohibe.

**A favor de Actions:** gratis e ilimitado en repos publicos (ver ADR 0008); sin limite de
duracion relevante; `workflow_dispatch` para disparar a mano; y la red de Actions **no** esta
bloqueada, a diferencia del contenedor de desarrollo, y Rappi no bloquea sus IPs.

**En contra:** GitHub atrasa o saltea los cron cuando esta cargado, asi que el cron es un
respaldo y el disparo fino conviene hacerlo con un servicio externo tipo cron-job.org llamando
a `workflow_dispatch`. Y GitHub desactiva los cron de repos sin actividad a los 60 dias: el
workflow se re-habilita solo al final de cada corrida.
