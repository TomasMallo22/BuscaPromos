# 06 — Identidad de producto

El problema: el mismo yogur es `product_id: 998877` en Rappi y `productId: 12345` en Jumbo.
Para que `vs_otras_tiendas` funcione hay que saber que son el mismo producto.

## Orden de preferencia

| # | Origen | Clave | Quien la tiene | ¿Habilita `vs_otras_tiendas`? |
|---|---|---|---|---|
| 1 | `ean` | `ean:7790040991` | VTEX (en `items[].ean`), Coto, SEPA | **si** |
| 2 | `rappi_master` | `rm:12345` | Rappi (`master_product_id`) | **si**, solo entre tiendas Rappi |
| 3 | `nombre_marca_presentacion` | `nmp:sancor\|yogurfrutilla\|1x900g` | todos, como fallback | **no** |

`claveCanonica()` de cada proveedor devuelve la mejor que puede.

## Por que el fallback no habilita la comparacion

El matching por nombre normalizado va a juntar:

```
"Yogur Ser Frutilla 190g"      <- un pote
"Yogur Ser Frutilla 190g x4"   <- un pack de cuatro
```

Y entonces el pack a $4.000 parece "el mismo producto que vale $1.200 en otra tienda, a 3.3x".
Al reves: el pote a $1.200 contra una mediana de $4.000 dispara `vs_otras_tiendas` con ratio
0.3 y manda una alerta **convincente y falsa**.

Es la peor clase de falso positivo, porque no se ve raro. Y dos o tres de esos y el usuario
deja de leer las alertas, que es el unico modo en que este proyecto falla de verdad.

Por eso la **regla de oro 15**: solo `ean` y `rappi_master` habilitan `vs_otras_tiendas`. El
costo es menos cobertura. Se acepta.

## Normalizacion para la clave `nmp`

Aunque no habilite la comparacion, la clave sirve para agrupar en la UI. Normalizacion:
minusculas, sin tildes, sin puntuacion, espacios colapsados, y la presentacion reducida a
`<n>x<cantidad><dim>` usando el mismo parser de `nuevo_vs_pasillo`.

## Si alguna vez se quiere habilitar el fuzzy

Spec propia, con **precision medida contra una muestra etiquetada a mano**. Sin ese numero no
se habilita. Lo que haria falta: una muestra de ~200 pares candidatos etiquetados por una
persona, y un umbral de precision >= 0.98 para los pares que habilitan la comparacion. Mas
barato que eso es esperar a que el proveedor exponga EAN.

## SEPA como puente

SEPA publica precios por **EAN** en ~3.600 comercios. Cuando entre (spec 005), mejora
`vs_otras_tiendas` para todos los demas proveedores que expongan EAN, sin tocar el matching.
Es el camino mas barato a una buena identidad cross-proveedor.
