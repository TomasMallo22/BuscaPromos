# 005 — Mis intereses · Propuesta

## El problema

Con los supermercados, el feed trae cientos de ofertas por dia de cosas que el dueño no compra
(vinos, cosmeticos, comida de mascotas). Lo que le importa se pierde entre lo demas. Pidio:
*"dejemos en los ajustes la posibilidad de poder configurar que nos interesa para traer y
comprar. Unicamente traigamos cosas extremas de ofertas si son productos que no estan
seleccionados"*.

## Para quien

El dueño y su pareja, cada uno con lo suyo.

## Como sabemos que se resolvio

El dueño elige en Ajustes "Lácteos y quesos" y "Almacén", y escribe "aceite de oliva". Al
abrir el feed ve solo ofertas de eso, mas las extremas de cualquier otra cosa (un producto a
menos de la mitad de su precio de siempre, o un error de precio). Telegram le manda lo mismo.
Si quiere mirar todo, toca "Ver todo".

## Decisiones tomadas con el dueño (2026-10-13)

- **Se sigue guardando todo el catalogo.** Filtrar al guardar deja sin historial a lo que se
  agregue despues a los intereses (hacen falta 7 dias para saber si una oferta es real), y deja
  sin referencia a las comparaciones contra otras tiendas y contra la gondola. La base pesa
  83 MB de 500; el crecimiento se mide en unas semanas y, si hace falta, se resume el historial
  viejo (otra spec).
- **Una sola lista de intereses** para el feed y para Telegram: las categorias y productos que
  ya existen para los avisos (spec 004).
- **"Extremo"** = 50% o mas debajo de su propio precio habitual, una oferta real (confirmada
  por el historial) de 50% o mas, o un error de precio. No cuenta lo que solo dice el precio
  tachado, ni la comparacion con la gondola, ni la diferencia con otras tiendas.

## Que queda afuera

- Dejar de guardar productos (descartado arriba).
- Retencion del historial: se decide con la medicion del 2026-11-03.
- Intereses por direccion: son por persona.
