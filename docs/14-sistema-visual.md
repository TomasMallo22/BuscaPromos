# 14 — Sistema visual

## El contexto de uso

Alguien mira el celular, ve que llego una alerta, y tiene que decidir en **tres segundos** si
vale la pena. Eso define todo lo demas.

Mobile-first no es "que ande en el celular": es que el celular es el caso principal y el
escritorio el secundario.

## Las reglas que la UI no puede romper

1. **El ratio manda.** El orden del feed es por `ratio` ascendente (mas descuento primero).
   Nunca alfabetico, nunca por fecha, salvo que el usuario lo pida explicitamente.
2. **Tres datos por card, no mas**: nombre + presentacion, precio actual, y de cuanto bajo.
   Todo lo demas (pasillo, tienda, historial) esta en el detalle.
3. **El precio de referencia siempre visible junto al actual.** "$1.200" sin contexto no dice
   nada; "$1.200, antes $5.500" lo dice todo. Es la tesis del proyecto en una linea de UI.
4. **El estado de la oferta se muestra, no se esconde.** `real` / `inflado` / `sin_historial`
   tienen badge propio. Un `inflado` que se muestra como oferta es exactamente lo que este
   proyecto existe para no hacer.
5. **Nunca mostrar 0 ni "—" cuando el dato falta.** Se dice que falta: "sin historial todavia",
   "juntando historial, dia 3 de 7". Un cero inventado es peor que un hueco declarado.
6. **Sin stock se ve distinto, y nunca llega como alerta.** Regla de oro 5.
7. **La imagen es decorativa.** Si no carga, la card tiene que seguir siendo util. Nunca es el
   unico modo de identificar el producto.

## Tokens

CSS custom properties en `:root`, con dark mode por `@media (prefers-color-scheme: dark)`.
Tipografia: `system-ui` — carga instantanea y se ve nativo en cada plataforma, que para una app
que se abre desde la pantalla de inicio importa mas que tener una fuente propia.

Semantica del color, que es lo unico no negociable de la paleta:

| Uso | Significado |
|---|---|
| alerta fuerte | `precio_absurdo`, `descuento_extremo`: probablemente un error de precio |
| oferta real | `gran_descuento` con `estado_oferta = 'real'` |
| neutro / informativo | `sin_historial`, "juntando historial" |
| atenuado | sin stock, hallazgo cerrado |

El rojo **no** se usa para "oferta" (en este dominio rojo es error o problema) ni el verde para
"barato" sin que el historial lo respalde.

## Las pantallas

| Ruta | Que |
|---|---|
| `/login` | un campo de mail, magic link. Nada mas |
| `/feed` | el listado de hallazgos vigentes. **La pantalla principal** |
| `/feed/[id]` | detalle: grafico de historial, tabla de precios, que regla disparo y por que |
| `/direcciones` | alta con pin en mapa (Leaflet + OSM, con atribucion) o lat/lng pegado |
| `/ajustes` | reglas habilitadas, ratio maximo, categorias excluidas, horario silencioso, canales |
| `/admin` | solo el dueño: corridas, descartadas, grupos fallidos (spec 003) |

## El grafico de historial

Dos series: precio actual (linea solida) y precio de lista (punteada), con los tramos de promo
marcados. SVG inline, sin libreria de charts: son dos series y 50 puntos.

**El grafico es el argumento.** Es donde se ve que el "descuento del 50%" es sobre un precio
que el producto tuvo tres dias. Si una sola pantalla justifica el proyecto, es esta.

## Estados vacios

| Situacion | Que dice |
|---|---|
| Usuario nuevo sin direcciones | "Carga una direccion para empezar" + boton |
| Con direccion, sin corrida todavia | "Buscando por primera vez. Esto tarda unos minutos" |
| Con historial corto | "Juntando historial, dia 3 de 7. Por ahora solo detectamos errores de precio" |
| Sin hallazgos vigentes | "Nada raro por ahora" — **no** es un error, es el caso normal |

El tercero es el mas importante: es la mitigacion del arranque ciego
([`03-motor-deteccion.md`](03-motor-deteccion.md) seccion 7). Sin ese mensaje, el dueño concluye
que el sistema no funciona justo cuando esta funcionando como se diseño.

## Accesibilidad

Contraste AA. Objetivos tactiles de 44px. El color **nunca** es el unico portador de
informacion: cada badge tiene texto. Un descuento no se comunica solo con rojo o verde.
