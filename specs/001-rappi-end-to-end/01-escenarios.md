# 001 — Rappi end-to-end · Escenarios

## Camino principal

### E1 — Primera corrida de una tienda nueva
- **Dado** una direccion con lat/lng y ninguna corrida previa
- **Cuando** corre `npm run corrida`
- **Entonces** se resuelve la tienda turbo, se recorre el catalogo completo, todos los productos
  entran como `nuevo`, y se escriben los hallazgos que no necesitan historial
  (`precio_absurdo`, `descuento_extremo`, `nuevo_vs_pasillo`). Se ven en la web, pero **no se
  notifica ninguno**: la primera corrida de una tienda no manda avisos

### E2 — Segunda corrida, sin cambios
- **Dado** una tienda ya recorrida y ningun precio movido
- **Entonces** **cero** filas nuevas en `precios_cambios` y cero hallazgos. Es la prueba de que
  el changelog funciona (regla de oro 2)

### E3 — Un precio baja fuerte
- **Dado** un producto con 20 dias de historial a $5.500
- **Cuando** aparece a $1.200
- **Entonces** dispara `caida_vs_historial` con ratio 0.218, se escribe en `hallazgos` con
  `precio_referencia = 5500`, y llega un Telegram

### E4 — El dueño ve la promo en la web
- **Cuando** entra a `/feed` desde el celular
- **Entonces** ve la card ordenada por ratio, con nombre, precio actual, **precio de referencia
  al lado**, la regla que disparo y el badge de `estado_oferta`

## Bordes

### E5 — Arranque ciego
- **Dado** 3 dias de historial
- **Entonces** el feed muestra "juntando historial, dia 3 de 7" y solo pueden aparecer
  `precio_absurdo` y `descuento_extremo`. **No es un error**

### E6 — Corrida incompleta
- **Dado** una tienda con 6.000 productos conocidos
- **Cuando** una corrida trae solo 2.400 (40%)
- **Entonces** la corrida queda `descartada`, los precios se aplican pero **no se genera ninguna
  alerta ni se marca nada sin stock** (regla de oro 6)

### E7 — Un sub-pasillo falla
- **Cuando** un grupo devuelve error de red
- **Entonces** va a `corridas.grupos_fallidos` y **sus productos NO se marcan sin stock**
  (regla de oro 7)

### E8 — Rappi cambia el layout
- **Dado** una respuesta con un nivel mas de anidamiento
- **Entonces** el walk recursivo con duck-test **sigue encontrando los mismos productos**

### E9 — El token de invitado vence
- **Cuando** un request devuelve 401
- **Entonces** se renueva el token una vez y se reintenta, sin romper la corrida

## Lo que NO tiene que pasar

### E10 — No se alerta sin stock
Regla de oro 5. Un producto agotado no genera hallazgo aunque su precio sea absurdo.

### E11 — No se alerta una promo de usuario nuevo
`has_global_offers && global_offer_max_quantity === 1` → `promo_usuario_nuevo`, que esta en
`promoKindsExcluidos` de Rappi. Verificado que no aplica a cuentas existentes.

### E12 — No se repite una alerta
- **Dado** un hallazgo ya avisado a $1.200
- **Cuando** la proxima corrida lo ve a $1.190 (bajo 0.8%)
- **Entonces** **no** se avisa de nuevo. Solo si baja mas del 5% (regla de oro 12)

### E13 — Un precio oscilando no abre y cierra en loop
- **Dado** un precio moviendose ±1% alrededor del umbral, 20 corridas
- **Entonces** a lo sumo **un** aviso. Es la histeresis de `cerrarAlertas`

### E14 — Un usuario no ve datos de otro
- **Dado** dos usuarios con suscripciones a tiendas distintas
- **Entonces** A no lee ningun hallazgo, tienda, precio ni direccion de B.
  **Probado con dos JWT reales, nunca con `service_role`**

### E15 — Nadie entra sin invitacion
- **Cuando** un mail que no esta en la lista pide el magic link
- **Entonces** rebota con un mensaje claro, y **no** se crea el perfil

## Escenarios de los filtros de dos niveles

### E16 — Algo de mi lista con descuento normal
- **Dado** `productos_interes = ['yogur']` y `ratio_maximo = 0.5`
- **Cuando** un yogur aparece a ratio 0.45
- **Entonces** llega el aviso

### E17 — Algo que NO esta en mi lista, con descuento normal
- **Cuando** una gaseosa aparece a ratio 0.45
- **Entonces** **no** llega: no esta en la lista y no supera la red de seguridad

### E18 — Algo que NO esta en mi lista, con descuento brutal
- **Cuando** una gaseosa aparece a ratio 0.20 (`ratio_maximo_general = 0.25`)
- **Entonces** **si llega.** Es exactamente el caso que el dueño no se quiere perder

### E19 — Lista vacia
- **Dado** un usuario que todavia no cargo nada
- **Entonces** recibe por la red de seguridad: solo lo muy fuerte. Nunca silencio total

## La direccion la carga cada usuario

### E20 — Cargo mi direccion y veo ofertas
- **Dado** un usuario sin direcciones
- **Cuando** toca "Usar mi ubicacion", ajusta el pin, le pone "Casa" y guarda
- **Entonces** se crea la fila en `direcciones`, se dispara `corrida.yml`, el feed dice "Buscando
  tu tienda de Rappi" y se actualiza solo; en unos minutos muestra los hallazgos de la primera
  corrida

### E21 — Rappi no tiene Turbo en esa zona
- **Entonces** la direccion queda marcada `sin_cobertura_at` y el feed lo dice. No se queda
  "buscando" para siempre

### E22 — Dos personas, la misma tienda
- **Dado** que el dueño y su pareja cargan direcciones que resuelven a la misma tienda
- **Entonces** hay **una** fila en `tiendas` y una sola corrida por turno; cada uno tiene su
  suscripcion

### E23 — Nadie ve la direccion de otro
- **Entonces** `direcciones` solo se lee con el JWT de su dueño, y las coordenadas que
  `tiendas` guarda para consultar a Rappi no se pueden leer con la clave publica (grant por
  columna). Las coordenadas nunca aparecen en logs ni en el summary de Actions (regla de oro 14)

### E24 — El disparo falla
- **Cuando** GitHub no acepta el `workflow_dispatch` (token vencido, caida)
- **Entonces** la direccion se guarda igual y el feed dice "buscando"; la toma el cron en la
  proxima media hora. Guardar nunca falla por el disparo

## Escenarios de las reglas de oro

| Regla | Escenario |
|---|---|
| 2 — el historial es la fuente de verdad | E2 |
| 5 — nunca sin stock | E10, E11 |
| 6 — corrida incompleta se descarta | E6 |
| 7 — grupo fallido no marca sin stock | E7 |
| 12 — se alerta lo nuevo, no lo que sigue | E12, E13 |
| 13 — RLS garantiza el aislamiento | E14 |
