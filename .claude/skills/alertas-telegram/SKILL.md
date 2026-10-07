---
name: alertas-telegram
description: Tocar las alertas y notificaciones de BuscaPromos — el fan-out a usuarios, el formato del mensaje de Telegram, la vinculacion del bot, el horario silencioso, o cualquiera de las 5 capas de anti-spam. Usar antes de modificar apps/crawler/src/notificar.ts o el webhook.
---

# Alertas y notificaciones

Leé [`docs/05-alertas-y-notificaciones.md`](../../../docs/05-alertas-y-notificaciones.md) y la
seccion 5 de [`docs/03-motor-deteccion.md`](../../../docs/03-motor-deteccion.md).

## El unico modo en que este proyecto falla de verdad

Que el usuario deje de leer las alertas. Dos o tres falsos positivos, o una alerta repetida
cuatro veces, y se ignoran todas. Todo lo de abajo existe para eso.

## Las 5 capas, y donde vive cada una

| # | Capa | Donde |
|---|---|---|
| 1 | solo productos nuevos o que cambiaron | el `RETURNING` de `aplicar_lote_precios` |
| 2 | `alerta_estado`: re-alerta solo si bajo >5% del precio avisado | `guardarAlerta` |
| 3 | cierre con **histeresis** | `cerrarAlertas` |
| 4 | dedupe por producto, se queda la regla de menor ratio | `notificar` |
| 5 | por usuario: `unique`, horario silencioso, tope por hora | `notificaciones` |

**Si llega una alerta repetida, el bug esta en una de esas cinco. Encontrá cual. No agregues una
sexta.**

La capa 3 es la menos obvia: sin histeresis, un precio oscilando ±1% alrededor del umbral abre
y cierra el hallazgo en loop, y cada apertura es una alerta. Hay un test con 20 corridas
simuladas; si tocás el cierre, corrélo.

## El fan-out es idempotente

```sql
insert into notificaciones (...) ... on conflict do nothing
```

Sobre `unique (hallazgo_id, usuario_id, canal)`. Se puede correr `npm run notificar` dos veces
sin duplicar nada. **Mantenelo asi**: un reintento despues de un fallo de red es normal.

## Separar "crear la notificacion" de "enviarla"

Primero se insertan las filas, despues se envian y se marca `enviado_at`. Si el envio falla, la
fila queda y el error va a `notificaciones.error`. Al reves (enviar y despues registrar) pierde
el registro si el proceso muere entre las dos cosas, y manda de nuevo en la proxima corrida.

## Los titulos salen del registry

`emoji`, `titulo` y `orden` vienen de `packages/core/src/reglas/registry.ts`. **No** de un
diccionario en `notificar.ts` — eso es exactamente lo que hacia el original y es la regla de
oro 10.

## Un aviso que falla no rompe la corrida

Todo el envio va envuelto en `try/catch`. Si Telegram esta caido, la corrida igual guardo los
precios y los hallazgos, que es lo que no se puede recuperar despues.

## La vinculacion del bot

1. La web crea un `token_vinculacion` de 8 caracteres, **TTL 15 minutos, un solo uso**.
2. Deep link `https://t.me/<bot>?start=<token>`.
3. El webhook recibe `/start <token>`, resuelve, guarda `destino = chat_id`, `verificado = true`.

**El webhook valida `X-Telegram-Bot-Api-Secret-Token`.** Sin eso, cualquiera que descubra la URL
inyecta mensajes. Y el TTL importa: un token sin vencimiento, filtrado en un historial de chat,
le manda tus alertas a otra persona.

## Nunca se alerta

- Un producto **sin stock** (regla de oro 5).
- Una `promo_kind` que esta en `promoKindsExcluidos` del proveedor.
- Un hallazgo anterior a la suscripcion del usuario (capa 5).

## Checklist

- [ ] `npm run notificar` dos veces seguidas no duplica
- [ ] Un producto que dispara 3 reglas manda **un** mensaje
- [ ] El horario silencioso retiene, no descarta
- [ ] El usuario nuevo no recibe los hallazgos vigentes de antes
- [ ] Ningun `chat_id` ni email en logs
- [ ] Titulos y emoji vienen del registry
