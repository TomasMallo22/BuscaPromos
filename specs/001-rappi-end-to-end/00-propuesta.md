# 001 — Rappi end-to-end · Propuesta

## El problema

Hay andamiaje, base de datos y el flujo de Rappi verificado, pero **ni una sola promo**. El
dueño no puede probar nada: `apps/web`, `apps/crawler`, `packages/core/src/deteccion` y
`packages/providers/src` estan todos vacios.

## Para quien

- **El dueño**, que quiere enterarse de que el yogur de $5.500 esta a $3.000.
- **Su pareja**, que entra con su propio mail a la misma web.

## Como sabemos que se resolvio

**El dueño recibe un Telegram con una promo real de Rappi, toca el link, y la ve en la web
desde el celular, con el precio actual, el precio de referencia y por que se detecto.**

## Decisiones tomadas con el dueño (2026-10-07)

### Registro: solo por invitacion

El dueño carga los mails habilitados; cualquier otro rebota con "pedile una invitacion".

Por que, y no registro abierto: cada direccion nueva en un barrio distinto es una tienda mas
que recorrer, y el argumento que sostiene el proyecto en
[`docs/11-legal-y-tos.md`](../../docs/11-legal-y-tos.md) es "uso personal, volumen bajo". Un
registro abierto al publico lo debilita.

### Filtros en dos niveles

El dueño identifico la tension exacta: *"la lista de las cosas que interesan es lo mejor, pero
si te olvidas de agregar algo y hay una oferta de lo que te olvidaste puede ser un problema,
por eso el umbral es importante"*.

La respuesta no es elegir una u otra:

| Nivel | Que cubre | Umbral |
|---|---|---|
| **1. Tu lista** | lo que anotaste en `productos_interes` | `ratio_maximo`, default 0.5 |
| **2. Red de seguridad** | **todo el resto del catalogo** | `ratio_maximo_general`, default 0.25 |

Resuelve el miedo concreto: **nunca te perdes una ganga monstruosa por no haberla anotado.**
Si algo esta al 25% de su precio habitual, llega igual. Y las ofertas mediocres de cosas que no
consumis quedan afuera.

### Se scrapea el catalogo completo, siempre

Filtrar **que se recorre** romperia dos cosas:

1. **El historial.** El precio habitual de un producto es lo que define si su precio de hoy es
   raro. Sin recorrerlo, no hay con que comparar.
2. **El percentil de gondola.** `nuevo_vs_pasillo` necesita 8 productos comparables del mismo
   sub-pasillo. Si solo traes "yogur", no hay gondola contra la cual medir.

Recorrer todo cuesta lo mismo en minutos de Actions. **Se recorre todo, se avisa de lo tuyo.**

## Que queda afuera

- La **pantalla** de direcciones: en esta spec la direccion se crea con
  `npm run resolver-tiendas -- --lat --lng`. Eso respeta el requisito de que la direccion sea un
  dato y no una constante, y deja la UI para la 002.
- La pantalla para editar la lista de productos de interes: tambien 002. Aca se carga por SQL.
- Cualquier proveedor que no sea Rappi.
- El dashboard de corridas: spec 003.

## Lo que hay que tener presente antes de arrancar

**El arranque ciego.** Las primeras 1-2 semanas solo pueden disparar `precio_absurdo`,
`descuento_extremo` y `nuevo_vs_pasillo`: las reglas buenas necesitan 7 a 14 dias de historial
propio. Ver [`docs/03-motor-deteccion.md`](../../docs/03-motor-deteccion.md) seccion 7. El feed
tiene que decirlo explicitamente ("juntando historial, dia 3 de 7") o el dueño va a concluir que
no funciona justo cuando esta funcionando como se diseño.

## Preguntas abiertas

| Pregunta | Estado |
|---|---|
| ¿Que lat/lng usa la primera direccion? | la decide el dueño. **No se commitea** (regla de oro 14) |
| ¿Se le aviso a Ivo? | pendiente, ver `docs/11-legal-y-tos.md` |
| ¿SMTP de Resend configurado? | pendiente del dueño. Sin eso el magic link se agota a los 2 mails/hora |
