# 05 — Alertas y notificaciones

## Los dos pasos

**Deteccion** (en la corrida) escribe `hallazgos` y `alerta_estado`. No sabe que existen
usuarios. **Notificacion** (`npm run notificar`, despues de la corrida) hace el fan-out.

## El fan-out

```sql
hallazgos nuevos y no cerrados
  join suscripciones  on tienda_id, y la regla esta en reglas_habilitadas,
                         y ratio <= ratio_maximo,
                         y categoria_path no empieza con ninguna categoria_excluida
  join canales_notificacion  where verificado
  insert into notificaciones  on conflict do nothing
```

El `on conflict do nothing` sobre `unique (hallazgo_id, usuario_id, canal)` es la capa 5 del
anti-spam: idempotente, se puede correr dos veces sin duplicar.

Antes de enviar se aplican las preferencias de `perfiles`: el **horario silencioso** (default
23:00 a 08:00 ART) retiene; el **tope por hora** (default 6) corta y lo que sobra queda en la
web. Un usuario nuevo recibe solo los hallazgos detectados **despues** de su suscripcion, no
los 40 vigentes.

## Dedupe por producto

Un producto puede disparar varias reglas a la vez. Se avisa **una** vez, con la de **menor
ratio** (el descuento mas fuerte). El orden de desempate sale de `DefinicionRegla.orden` del
registry, no de un `ORDER BY` escrito en el query.

## El mensaje de Telegram

```
🚨 3 precios raros · 🔥 2 ofertas fuertes

🚨 Bajo vs. su precio habitual
Yogur Ser Frutilla 190g
$1.200  (antes $5.500, -78%)
https://www.rappi.com.ar/tiendas/112233-turbo/s?term=Yogur%20Ser...
```

Un mensaje de cabecera con el conteo, y despues hasta 10 individuales. Los emoji y los titulos
salen del registry (`emoji`, `titulo`), no de un diccionario aparte — regla de oro 10.

El formateo de moneda es el de Argentina: `$1.200,50`, punto para miles y coma para decimales.

Todo el envio va envuelto en `try/catch`: **un aviso que falla no debe romper la corrida.**

## Vincular Telegram sin servidor ni polling

1. La web crea una fila en `canales_notificacion` con un `token_vinculacion` de 8 caracteres y
   TTL de 15 minutos, y muestra el deep link `https://t.me/<bot>?start=<token>`.
2. El bot tiene el webhook configurado a `/api/telegram/webhook`, validado con el header
   `X-Telegram-Bot-Api-Secret-Token`.
3. El route handler recibe `/start <token>`, lo resuelve, guarda `destino = chat_id` y
   `verificado = true`.
4. El envio lo hace el job de Actions, que ya tiene red y secrets.

Cero polling, cero proceso vivo, cero costo. `api.telegram.org` no esta bloqueado desde Actions.

## Email

Mismo fan-out, canal `email`, sobre la cuenta de Resend que ya se usa para el SMTP de Supabase
Auth. No es una integracion nueva. Llega despues de que Telegram funcione.

## Las 5 capas, otra vez

Estan en [`03-motor-deteccion.md`](03-motor-deteccion.md), seccion 5. El resumen: capas 1-3 en
la deteccion, capa 4 al armar el mensaje, capa 5 por usuario.

**Si una alerta llega repetida, el bug esta en una de las 5 capas y hay que encontrar en cual,
no agregar una sexta.**
