# 001 — Rappi end-to-end · Propuesta

> **Spec sin empezar.** Este archivo es el encuadre; el resto se completa al arrancar la spec,
> con `/nuevo-cambio` y la skill `refinar-pedido`.

## El problema

Hay un andamiaje y una pantalla vacia. No hay ni una promo.

## Para quien

El dueño, que quiere enterarse de que el yogur de $5.500 esta a $3.000.

## Como sabemos que se resolvio

**El dueño recibe un Telegram con una promo real de Rappi, toca el link, y la ve en la web desde
el celular, con el precio actual, el precio de referencia y por que se detecto.**

## Que queda afuera

- La **pantalla** de direcciones: la direccion se crea con `npm run resolver-tiendas --lat --lng`.
  Eso respeta el requisito "que la direccion no sea un dato fijo" en lo que importa — es una fila
  en `direcciones` y el crawler itera sobre `tiendas` — y deja la UI para la spec 002.
- Multiusuario de verdad (invitaciones, ajustes por usuario): spec 002.
- Cualquier proveedor que no sea Rappi.
- El dashboard de corridas: spec 003.

## Lo que hay que tener presente antes de arrancar

**El arranque ciego.** Las primeras 1-2 semanas solo pueden disparar `precio_absurdo`,
`descuento_extremo` y `nuevo_vs_pasillo`: las reglas buenas necesitan 7 a 14 dias de historial
propio. Ver `docs/03-motor-deteccion.md` seccion 7. El estado vacio del feed tiene que decirlo
explicitamente ("juntando historial, dia 3 de 7") o el dueño va a concluir que no funciona.

## Preguntas abiertas

| Pregunta | Estado |
|---|---|
| ¿Se resolvio el bloqueo de red B1? | define si el cliente de Rappi se itera aca o solo contra fixtures |
| ¿Que lat/lng usa la primera direccion? | la decide el dueño; **no se commitea** (regla de oro 14) |
| ¿Se le aviso a Ivo? | pendiente, ver `docs/11-legal-y-tos.md` |
