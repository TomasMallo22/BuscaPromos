# 003 — Turbo completo, filtro por categoria y direcciones editables · Propuesta

## El problema

El dueño uso la web unos dias y encontro cuatro cosas (2026-10-13):

1. **En su casa Rappi Turbo llega, pero el buscador dice que no.** Rappi tiene 10 tiendas que
   la app llama "Turbo" (`turbo`, `turbo_veinticuatro_nc`, `turbo_express`, `turbo_carnes_nc`...);
   el buscador solo aceptaba `store_type === 'turbo'`. En su casa, a 49 m del borde de la zona de
   la Turbo clasica, la que llega es **Turbo 24 hs**.
2. **Quiere elegir que mirar, no limitar que llega**: que vengan todas las ofertas y poder
   filtrar por categoria ("lacteos", "almacen"). Reemplaza la idea de la spec 001 de "lista de
   productos de interes + umbral".
3. **Las direcciones no se pueden editar ni borrar**, y el GPS del celular no siempre ubica bien.
   Cargo la oficina por error y tuvo que borrarla desde la base.
4. **El buscador corre 4 o 5 veces por dia**, no cada 30 minutos: GitHub atrasa y saltea los
   cron de Actions (medido en `corridas` del 08 al 13/10: huecos de hasta 9 horas).

Y dos bugs que aparecieron al investigar:

5. **"Sin cobertura" se marcaba de noche**: la regla era "24 h desde que se creo", y si en ese
   lapso el buscador no corrio de dia, la primera corrida nocturna la daba por perdida.
6. **Borrar una direccion dejaba su suscripcion**: la tienda de la oficina se seguia recorriendo.

## Para quien

El dueño y quienes usen la web desde el celular.

## Como sabemos que se resolvio

- El dueño carga su casa escribiendo la direccion, la ve en el mapa, guarda, y en su feed
  aparece "Rappi Turbo 24 hs" con sus ofertas.
- Toca "Lácteos" y ve solo ofertas de lacteos, de todas sus tiendas.
- Edita el nombre de una direccion, mueve otra, borra la de la oficina, y la tienda de la
  oficina deja de recorrerse.
- La tabla `corridas` muestra una corrida cada ~30 minutos.

## Decisiones tomadas con el dueño (2026-10-13)

- **Que Turbo:** la clasica y la **24 hs**, cada 30 minutos. Las especializadas (Carnes,
  Discounter, Supermercado, Express, Mascotas...) quedan afuera por volumen (regla de oro 16):
  las 10 juntas son ~55.000 productos solo en su zona.
- **Filtro por categoria:** en el feed ahora; cuando se haga Telegram, el usuario elige de que
  categorias le llegan avisos.
- **Direccion por texto:** con la API Georef del Estado (datos.gob.ar): gratuita, sin clave,
  pensada para direcciones argentinas. El resultado se confirma en el mapa antes de guardar.
  Revierte el "geocoding fuera de alcance" de `docs/08-roadmap.md`: el dueño lo pidio porque el
  GPS no le alcanza.

## Que queda afuera

- Elegir tiendas por usuario.
- Las Turbo especializadas.
- Filtrar por tienda (solo por categoria y por nombre).
