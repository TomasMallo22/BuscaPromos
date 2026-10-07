---
description: Crear una spec nueva en specs/NNN-<slug>/ desde la plantilla y arrancar por la propuesta
---

Creá una spec nueva para: $ARGUMENTS

Pasos:

1. Mirá `specs/` y tomá el proximo numero libre de tres digitos. Armá un slug corto en
   castellano, sin tildes, con guiones.
2. `cp -r specs/_plantilla specs/NNN-<slug>` y reemplazá `NNN — <titulo>` en los seis archivos.
3. **Cargá la skill `refinar-pedido`** y completá solo `00-propuesta.md`. Si el pedido es vago,
   hacé las preguntas de esa skill antes de escribir: preguntar sale mucho mas barato que
   construir la feature equivocada.
4. Agregá la fila en la tabla "Estado de las specs" de `specs/README.md`.
5. Pará ahi y mostrale la propuesta al dueño. **No sigas con los escenarios ni el diseño hasta
   que la propuesta este acordada.**

Recordá: `00-propuesta.md` no menciona tablas, nombres de funcion ni librerias. Si aparecen, se
escribio al reves.

Si el pedido es chico — un umbral, un color, un texto, un bug con arreglo acotado — decilo y no
crees la spec: va directo con un PR.
