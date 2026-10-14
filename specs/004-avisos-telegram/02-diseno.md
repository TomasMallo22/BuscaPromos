# 004 — Avisos por Telegram · Diseño

## Datos (0019)

- `perfiles.avisos_categorias text[]` y `perfiles.avisos_terminos text[]`, con checks de tamaño.
  `authenticated` puede actualizar solo esas columnas, el nombre y las del silencio.
- `canales_notificacion`: `authenticated` deja de poder insertar y actualizar (puede leer y
  borrar). Dos funciones `security definer`:
  - `public.crear_vinculo_telegram()` (authenticated): borra los vinculos pendientes del usuario
    y crea uno con un token de 32 hex al azar y vencimiento a 15 minutos. Devuelve el token.
  - `public.vincular_telegram(token, chat_id)` (anon: la llama el webhook con la clave
    publica): si el token existe, no vencio y no se uso, guarda el chat, marca `verificado` y
    borra los otros canales de Telegram del usuario. Devuelve si vinculo.
- `notificaciones` (ya existe) para los hallazgos, y `avisos_descuento` para los descuentos
  anunciados: `(usuario_id, tienda_id, producto_id)` con `precio_avisado`, `pendiente`,
  `enviada_at`, `error`. RLS: el usuario lee los suyos.

## Envio (`apps/crawler/src/notificar.ts`)

Corre despues de la corrida, en el mismo job (`if: always()`). Patron outbox: **primero se
registra, despues se envia** (skill `alertas-telegram`).

1. Usuarios con Telegram verificado y alguna preferencia.
2. Candidatos:
   - hallazgos abiertos, `notificar = true`, de las ultimas 24 h, posteriores a la suscripcion
     del usuario a esa tienda, de sus tiendas, que matchean una categoria o un termino;
   - descuentos anunciados (`ratio_lista <= 0.7`, en stock, sin promo excluida) de sus tiendas
     que matchean un termino.
3. `planificarAvisos` (puro, con tests): dedupe por producto (capa 4, menor ratio y desempate
   por `orden` del registry), anti-spam de descuentos (`decidirAlerta` del core, capa 2).
4. Se registran: `notificaciones` con `on conflict do nothing`; `avisos_descuento` con upsert.
5. Se envian los pendientes de menos de 24 h, salvo en horario silencioso, hasta el tope por
   hora (contando lo enviado en la ultima hora), los de mas descuento primero. Los de mas de
   24 h se marcan vencidos.
6. Cada envio va en `try/catch`: un fallo queda en `error` y se reintenta.

`coincideTermino(nombre, termino)`: sin tildes ni mayusculas; cada palabra del termino tiene
que aparecer en el nombre, tolerando la ultima letra en palabras de 5+ letras.

## Webhook (`apps/web/app/api/telegram/webhook`)

Publico para el middleware, pero valida `X-Telegram-Bot-Api-Secret-Token` contra
`TELEGRAM_WEBHOOK_SECRET` (comparacion de tiempo constante). `/start <token>` -> RPC
`vincular_telegram` con la clave publica -> responde por el bot. Siempre 200 a Telegram.

El webhook se registra con `telegram-webhook.yml` (manual), para que el token del bot no pase
por el navegador.

## Web

`/ajustes`: estado de Telegram (Conectar / Conectado + Desconectar), categorias con checkboxes y
productos (uno por linea). Si conecto y no eligio nada, lo dice.

## Variables

| Donde | Nombre |
|---|---|
| GitHub secrets | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` |
| GitHub variables | `URL_WEB` |
| Vercel | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `NEXT_PUBLIC_TELEGRAM_BOT` (el usuario del bot, no es secreto) |
