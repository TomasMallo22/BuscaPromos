---
name: refinar-pedido
description: Convertir un pedido vago en uno implementable, antes de escribir la spec. Usar cuando el dueño pide algo en una frase ("que avise por WhatsApp", "que busque tambien en Coto", "que sea mas rapido") y no esta claro el alcance, para quien es, ni como se sabria que esta resuelto.
---

# Refinar un pedido

Antes de `00-propuesta.md`. El objetivo es llegar a tres cosas claras: **el problema, para
quien, y como sabemos que se resolvio.**

## El error a evitar

Empezar a diseñar sobre la primera lectura del pedido. "Que avise por WhatsApp" puede ser:

- "Telegram no me gusta" → cambiar de canal
- "mi pareja no usa Telegram" → multi-canal por usuario
- "no me entero de las alertas" → el problema es el horario o el tope, no el canal

Las tres llevan a implementaciones distintas y la frase no distingue. **Preguntar sale mucho mas
barato que construir la equivocada.**

## Las preguntas que sirven

1. **¿Que te pasó que te hizo pedir esto?** La anecdota concreta dice mas que la feature. "Se me
   paso una promo de pañales" lleva a un lugar distinto que "quiero mas alertas".
2. **¿Quien lo sufre?** El dueño, su pareja, un amigo, el que mantiene el sistema. Puede ser mas
   de uno con necesidades opuestas.
3. **¿Como sabrias que quedo resuelto?** Si no hay respuesta observable, el pedido todavia no
   esta listo. "El crawler funciona" no sirve; "recibo la promo de pañales el mismo dia" si.
4. **¿Que pasa si no lo hacemos?** Separa lo importante de lo que suena bien.
5. **¿Que NO incluye?** Lo que no se dice que queda afuera, se asume adentro.

## Cuando el pedido choca con una regla de oro

Pasa, y hay que decirlo en el momento, no a mitad de la implementacion. Ejemplos reales:

- "Que avise aunque no haya stock" → choca con la 5. Probablemente lo que quiere es que se lo
  avise **cuando vuelva**, que es otra feature.
- "Que compare precios entre todas las cadenas" → choca con la 15 para los productos sin EAN.
  Se puede hacer para los que si lo tienen.
- "Que alerte mas seguido" → choca con la 12. Lo que suele querer es bajar `ratio_maximo`, no
  recibir la misma alerta de nuevo.

**No es decir no.** Es decir "eso que pedís, tal cual, rompe X; esto otro te da el 90% sin
romperlo, ¿sirve?".

## Cuando NO hace falta una spec

- Un umbral, un color, un texto.
- Un bug con causa clara y arreglo acotado.
- Algo que se explica en una frase y no puede romper nada mas.

Esos van directo con un PR. **Si dudás, es spec.**

## La salida

Un `00-propuesta.md` que: no menciona ni una tabla ni un nombre de funcion, tiene una condicion
de exito observable, y dice explicitamente que queda afuera.

Si despues de refinar el pedido sigue sin estar claro para quien es o como se verifica, **el
pedido no esta listo** y hay que volver a preguntar, no diseñar sobre la duda.
