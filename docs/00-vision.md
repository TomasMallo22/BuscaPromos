# 00 — Vision

## El problema

Un yogur vale $5.500. Un dia aparece a $3.000. ¿Es una oferta de verdad, o el precio tachado
esta inflado para que su precio de siempre parezca un descuento?

Los retailers mueven miles de precios por dia y publican un "precio de lista" que no siempre
es el precio al que el producto se vendio alguna vez. El truco clasico: subir el precio una
semana y despues "rebajarlo" a lo que costaba. Mirando solo la pagina es indistinguible.

Mirando el **historial propio** del producto, es obvio.

## Que hace BuscaPromos

Recorre catalogos (Rappi primero, despues supermercados), guarda cada cambio de precio, y usa
ese historial para responder dos preguntas distintas:

1. **¿Esto es un error de precio?** Un producto a $1, o al 20% de su precio habitual.
   Son raros, duran poco, y hay que enterarse ya.
2. **¿Esto es una oferta real?** Un descuento fuerte que **tambien** es una baja respecto de
   lo que el producto venia costando. Dura mas, y es lo que uno usa para hacer las compras.

Lo que aparece en la lista y lo que llega por Telegram es eso, ordenado por cuanto bajo.

## Quienes la usan

El dueño, su pareja, y amigos o familia. Cada persona carga **sus** direcciones y recibe las
promos de las tiendas que la atienden. La direccion es un dato que se carga y se cambia, nunca
una constante del codigo.

El scrapeo es **por tienda**, no por usuario: si tres personas del mismo barrio caen en la
misma tienda de Rappi, se recorre una sola vez. Sumar gente no cuesta nada.

## Que NO es

- **No es un comparador de precios.** No busca el mas barato entre cadenas; busca lo que esta
  fuera de su propio rango normal. La comparacion cross-tienda existe, pero como una regla mas.
- **No es un producto.** Es de uso personal, volumen bajo, sin reventa de datos.
  Ver [`11-legal-y-tos.md`](11-legal-y-tos.md).
- **No es tiempo real.** El cron corre cada 15-30 minutos. Una promo de supermercado dura
  horas o dias; un error de precio, a veces menos. Se acepta perder algunos.

## De donde viene

El motor de deteccion es un port a TypeScript del de
[`ivokalaizic/rappi-turbo-radar`](https://github.com/ivokalaizic/rappi-turbo-radar), que ya
resolvio la parte dificil: distinguir una oferta real de un tachado inflado, y no mandar la
misma alerta cada 15 minutos. Lo que se rehizo es la arquitectura: ese proyecto es
monousuario, mono-proveedor y guarda el estado en el cache de GitHub Actions.

Lo que se conserva, porque es el valor intelectual, esta en
[`03-motor-deteccion.md`](03-motor-deteccion.md).

## Como se mide que funciona

| Señal | Que quiere decir |
|---|---|
| Se compro algo por una alerta | El objetivo. Lo demas son medios. |
| Pocas alertas, casi todas utiles | Un falso positivo cuesta la confianza: dos o tres y se ignoran todas. |
| Ninguna alerta repetida | El anti-spam funciona. Ver reglas de oro 12. |
| Ninguna corrida descartada en silencio | El sistema avisa cuando se esta rompiendo. |
