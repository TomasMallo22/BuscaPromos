# 002 — Supermercados de Rappi · Propuesta

## El problema

El dueño cargo su direccion de noche y el feed quedo vacio: Rappi Turbo cierra y su tienda
desaparece de la lista. Ademas, Turbo es una sola tienda: no hay contra que comparar. El dueño
pidio *"que busque ofertas en todo Rappi y no solamente Rappi Turbo"*.

## Para quien

- **El dueño y quienes usen la web**, que quieren ver ofertas apenas cargan su direccion, a
  cualquier hora, y saber si algo esta mas barato en otro supermercado de la zona.

## Como sabemos que se resolvio

**El dueño carga una direccion de noche y, en menos de una hora, el feed le muestra productos
de los supermercados de Rappi de su zona, cada uno con el nombre de la tienda. Cuando un
producto esta a la mitad de lo que cuesta en las otras tiendas, aparece como hallazgo "mas
barato que en otras tiendas".**

## Decisiones tomadas con el dueño (2026-10-08)

- **Que tiendas:** Rappi Turbo y los 8 supermercados que Rappi ofrece en la zona: Jumbo,
  Disco, Vea, Carrefour, Carrefour Express, Coto, Dia y Farmacity. Medido en la zona del
  Obelisco: ~57.000 productos en total, Coto el mas grande (~14.500).
- **No "todo Rappi" literal:** ni los ~3.300 restaurantes (no hay precio de gondola que
  comparar) ni las ~150 tiendas chicas. Serian cientos de miles de productos por pasada contra
  la regla de oro 16.
- **Cada cuanto:** Turbo cada 30 minutos; los supermercados **cada 4 horas**. Los precios de
  supermercado cambian poco, y asi el volumen pasa de ~9.000 a ~26.000 requests por dia por
  zona, siempre de a uno y con pausa.
- **Comparar entre tiendas:** Rappi usa el mismo `master_product_id` en todas sus tiendas
  (verificado: 54 gaseosas en comun entre Jumbo y Coto, 39 tambien en Turbo; la Coca-Cola de
  1,25 L estaba $2.699 en Coto, $3.400 en Jumbo y $3.859 en Turbo). Es identidad de origen
  `rappi_master`, que la regla de oro 15 habilita para `vs_otras_tiendas`.

## Lo que hay que tener presente

- **Rappi cobra distinto que la web propia de cada super.** No afecta la deteccion: cada
  producto se compara contra su propio historial en esa tienda, y `vs_otras_tiendas` compara
  precios de Rappi contra precios de Rappi.
- **Volumen.** Es el cambio de mayor exposicion de ToS del proyecto hasta ahora. Se anota en
  `docs/11-legal-y-tos.md`.

## Que queda afuera

- Elegir tiendas por usuario: por ahora todos los usuarios de una zona reciben las 9.
- Restaurantes y tiendas especializadas.
- Los supermercados por su web propia (VTEX): sigue siendo la spec de VTEX del roadmap, que
  ademas trae EAN.
