# 08 — Roadmap

Una spec por iteracion. El ciclo de vida de cada una esta en [`../specs/README.md`](../specs/README.md).

| Spec | Que | Entregable |
|---|---|---|
| **000** | Andamiaje SDD + esqueleto | el dueño se loguea desde el celular y ve una pantalla vacia |
| **001** | Rappi end-to-end, una direccion | recibe un Telegram con una promo real y la ve en la web |
| **002** | Multiusuario y pantalla de direcciones | su pareja y un amigo entran y cargan sus direcciones |
| **003** | Robustez y observabilidad | el sistema avisa cuando se esta rompiendo |
| **004** | VTEX: Jumbo, Disco, Vea, Carrefour, Dia, ChangoMas | promos de supermercado, y `vs_otras_tiendas` encendido |
| **005** | SEPA como baseline | precio de referencia por EAN en ~3.600 comercios |
| **006** | Coto | |
| **007** | La Anonima | |
| **008** | PedidosYa: decision documentada | un ADR, nada de codigo |

## Por que este orden

**000 antes que nada.** El andamiaje no es burocracia: las 16 reglas de oro del `CLAUDE.md`
son lo que evita que los cinco problemas estructurales del repo original se reintroduzcan en
el mes 6.

**001 es Rappi y no VTEX**, aunque VTEX sea tecnicamente mas facil. Dos razones: es portar algo
que ya funciona, y Rappi es el caso de "una direccion → una tienda", que es exactamente el
modelo que el dueño pidio. VTEX obliga antes a resolver sucursal y regionalizacion.

**002 antes que 004.** Primero que la usen las personas, despues mas fuentes. Un proyecto con
cuatro proveedores y un solo usuario es un proyecto que no se usa.

**003 antes que 004.** Antes de agregar proveedores, que el que hay no se caiga en silencio.
Con dos proveedores y sin observabilidad, un error de Rappi se confunde con uno de VTEX.

**004 es el examen del contrato.** Si agregar VTEX obliga a tocar `packages/core`, el contrato
de `Proveedor` estaba mal y hay que arreglarlo ahi, no parchear. Es tambien lo que enciende
`vs_otras_tiendas` de verdad, porque VTEX expone EAN.

**005 (SEPA) tiene un valor desproporcionado a su esfuerzo**: es la unica fuente con licencia
CC-BY que habilita el uso, y mejora la identidad cross-proveedor de todos los demas.

**008 no se implementa.** PerimeterX bloquea IPs de datacenter. El ADR existe para no
re-discutirlo cada tres meses.

## Lo que esta fuera de alcance, a proposito

- **Geocoding.** El usuario pone un pin en un mapa (Leaflet + OSM) o pega el lat/lng de Google
  Maps. Nominatim pide 1 req/s y atribucion; Google Places pide tarjeta. Para 10 usuarios con
  2 direcciones cada uno, no se construye geocoding.
- **Comparador de precios.** No es lo que hace este proyecto. Ver [`00-vision.md`](00-vision.md).
- **App movil.** La web es mobile-first y se agrega a la pantalla de inicio.
- **Carrito o compra automatica.** Se avisa; comprar lo hace una persona.
