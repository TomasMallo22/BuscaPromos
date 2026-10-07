---
name: ui-buscapromos
description: Construir o modificar pantallas de la web de BuscaPromos — el feed de hallazgos, el detalle con el grafico de historial, direcciones, ajustes, o los estados vacios. Usar antes de tocar apps/web.
---

# UI de BuscaPromos

Leé [`docs/14-sistema-visual.md`](../../../docs/14-sistema-visual.md).

## El contexto de uso define todo

Alguien mira el celular, ve que llego una alerta, y decide en **tres segundos** si vale la pena.
Mobile-first no es "que ande en el celular": el celular es el caso principal.

## Las 7 reglas que la UI no puede romper

1. **El orden es por `ratio` ascendente.** Mas descuento primero. Nunca alfabetico ni por fecha.
2. **Tres datos por card**: nombre + presentacion, precio actual, cuanto bajo. El resto, al
   detalle.
3. **El precio de referencia siempre junto al actual.** "$1.200" no dice nada; "$1.200, antes
   $5.500" lo dice todo. Es la tesis del proyecto en una linea de UI.
4. **El `estado_oferta` se muestra, no se esconde.** Un `inflado` presentado como oferta es
   exactamente lo que este proyecto existe para no hacer.
5. **Nunca mostrar 0 ni "—" cuando el dato falta.** Se dice que falta.
6. **Sin stock se ve distinto, y nunca llega como alerta.**
7. **La imagen es decorativa.** Si no carga, la card sigue siendo util.

## La web no calcula nada

`hallazgos` ya tiene `precio_referencia`, `ratio` y `estado_oferta` **persistidos**. La web los
lee y los ordena. Regla de oro 11.

**No reimplementes** `estadoOferta`, la mediana ni el parser de presentacion en el front. El
repo original lo hizo (tenia `offer_status` en Python y otra vez en JavaScript) y es el pecado
que este proyecto no repite. Si la UI necesita un numero que no esta, se agrega una columna.

## Acceso a datos

Siempre por `packages/db`. **Ningun `supabase.from(` en un componente** — hay un `grep` en CI.

**Jamas importar el cliente `service_role` desde `apps/web`.** Es el bug de una linea que expone
la base entera. Hay lint rule, `grep` en CI, y un throw en runtime; igual, no lo intentes.

Server Components por defecto. `'use client'` solo donde haya interaccion real.

## Los estados vacios son features

| Situacion | Que dice |
|---|---|
| sin direcciones | "cargá una dirección para empezar" + boton |
| con direccion, sin corrida | "buscando por primera vez, esto tarda unos minutos" |
| **historial corto** | **"juntando historial, día 3 de 7. Por ahora solo detectamos errores de precio"** |
| sin hallazgos | "nada raro por ahora" — no es un error, es el caso normal |

El tercero es el mas importante del proyecto. Sin ese mensaje, el dueño concluye que el sistema
no funciona **justo cuando esta funcionando como se diseño** (el arranque ciego,
[`docs/03`](../../../docs/03-motor-deteccion.md) seccion 7).

## El grafico de historial

SVG inline, sin libreria: son dos series y ~50 puntos. Precio actual solido, precio de lista
punteado, tramos de promo marcados.

**El grafico es el argumento.** Es donde se ve que el "-50%" es sobre un precio que el producto
tuvo tres dias. Si una sola pantalla justifica el proyecto, es esta.

## Color

El rojo **no** es "oferta" (en este dominio es error o problema) y el verde no es "barato" sin
que el historial lo respalde. Y el color nunca es el unico portador de informacion: cada badge
lleva texto.

## Checklist

- [ ] Anda a 360px de ancho, sin scroll horizontal
- [ ] Orden por ratio
- [ ] Precio de referencia visible junto al actual
- [ ] Badge de `estado_oferta` con texto, no solo color
- [ ] Ningun dato faltante mostrado como 0
- [ ] Contraste AA, objetivos tactiles de 44px
- [ ] Ningun `supabase.from(` en un componente
- [ ] El estado vacio correcto para cada situacion
