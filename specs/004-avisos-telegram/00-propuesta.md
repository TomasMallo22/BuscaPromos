# 004 — Avisos por Telegram, por categoria y por producto · Propuesta

## El problema

El feed ya muestra ofertas, pero hay que entrar a mirarlo. El dueño quiere enterarse sin
entrar: *"avisos de telegram para las categorias elegidas o nombre especifico de producto, por
ejemplo aceite de oliva, yogurt natural"*.

## Para quien

El dueño y su pareja, cada uno con su Telegram y sus preferencias.

## Como sabemos que se resolvio

El dueño conecta Telegram desde Ajustes, elige "Lácteos y quesos" y escribe "aceite de oliva".
Cuando BuscaPromos detecta algo de lacteos, o un aceite de oliva aparece con un 30% o mas de
descuento anunciado por Rappi, le llega un mensaje con el producto, el precio, cuanto bajo, la
tienda y el link. No le llega lo mismo dos veces, ni a la madrugada.

## Decisiones tomadas con el dueño (2026-10-13)

| Que llega | Para categorias | Para productos escritos |
|---|---|---|
| Detecciones de BuscaPromos (hallazgos) | si | si |
| Descuentos que **anuncia** Rappi (>= 30%), marcados "segun Rappi" | no | si |

Los descuentos anunciados por categoria quedaron afuera: en "Almacén" serian decenas por dia.
Reemplaza el filtro de la spec 001 ("lista de productos + umbral"): el usuario elige que le
interesa, no un umbral.

**Sin preferencias no llega nada.** Es opt-in: un usuario que conecta Telegram y no elige nada
no recibe avisos (y la web se lo dice).

## Que queda afuera

- Email (sigue en el roadmap).
- Editar el horario silencioso y el tope por hora desde la web (se usan los defaults de
  `perfiles`: 23 a 8 h y 6 por hora).
- Descuentos anunciados por categoria.
