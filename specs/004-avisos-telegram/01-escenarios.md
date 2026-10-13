# 004 — Avisos por Telegram · Escenarios

## Camino principal

### E1 — Conecto Telegram
- **Cuando** toco "Conectar Telegram" en Ajustes
- **Entonces** se abre el bot con `/start <token>`, lo toco, el bot responde "Listo" y Ajustes
  dice "Conectado"

### E2 — Una deteccion de una categoria que elegi
- **Dado** que elegi "Lácteos y quesos"
- **Cuando** el buscador abre un hallazgo de un yogur (con `notificar = true`)
- **Entonces** me llega un mensaje con el titulo y emoji de la regla (del registry), el
  producto, el precio, la referencia, cuanto bajo, la tienda y el link

### E3 — Un descuento anunciado de un producto que escribi
- **Dado** que escribi "aceite de oliva"
- **Cuando** un "Aceite de Oliva Extra Virgen" esta con 35% de descuento anunciado por Rappi
- **Entonces** me llega, marcado "Descuento que anuncia Rappi (sin verificar)"

### E4 — "yogurt natural" encuentra "Yogur Natural"
- La busqueda por producto no distingue mayusculas ni tildes, y tolera la ultima letra
  ("yogurt" -> "yogur", "aceites" -> "aceite")

## Bordes

### E5 — Un producto que dispara tres reglas
- **Entonces** llega **un** mensaje, con la regla de menor ratio (capa 4)

### E6 — Horario silencioso
- **Dado** las 2 de la mañana (silencio 23 a 8 h)
- **Entonces** no se envia nada; los avisos quedan pendientes y salen despues de las 8, si no
  tienen mas de 24 h

### E7 — Tope por hora
- **Dado** 15 avisos nuevos y un tope de 6 por hora
- **Entonces** salen 6 (los de mas descuento), el resto queda pendiente para la proxima corrida

### E8 — El usuario nuevo
- **Entonces** no recibe los hallazgos abiertos de antes de su suscripcion (capa 5)

### E9 — El mismo descuento anunciado en la corrida siguiente
- **Entonces** no vuelve a llegar. Llega de nuevo solo si el precio baja mas de 5% respecto del
  avisado (capa 2, `decidirAlerta` del core)

## Lo que NO tiene que pasar

### E10 — Correr `notificar` dos veces
- No duplica nada (`on conflict do nothing` + envio separado del registro)

### E11 — Alguien descubre la URL del webhook
- Sin el header `X-Telegram-Bot-Api-Secret-Token` correcto, responde 401 y no hace nada

### E12 — Un token de vinculacion viejo o ajeno
- Vencido (15 min) o ya usado: no vincula. El token tiene 122 bits al azar: no se adivina

### E13 — Un usuario se pone `verificado = true` o el chat de otro
- No puede: `authenticated` no escribe `canales_notificacion`. El token lo crea una funcion y la
  vinculacion la hace otra, las dos en la base

### E14 — Telegram caido
- La corrida no se rompe: los avisos quedan con `error` y se reintentan

### E15 — `chat_id` en un log
- Nunca (regla de oro 14)
