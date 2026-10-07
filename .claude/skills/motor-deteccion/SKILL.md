---
name: motor-deteccion
description: Tocar el motor de deteccion de BuscaPromos — las 7 reglas, el precio habitual, el estado de la oferta, nuevo_vs_pasillo, o cualquiera de las 5 capas de anti-spam. Usar antes de modificar packages/core, de agregar o cambiar una regla, o de ajustar un umbral.
---

# Motor de deteccion

Leé [`docs/03-motor-deteccion.md`](../../../docs/03-motor-deteccion.md) completo antes de tocar
nada. Lo de abajo es lo que mas se rompe.

## Lo primero

El motor **no toca la red, no toca la DB, no hace I/O**. Recibe datos, devuelve hallazgos. El
reloj se inyecta (`ahora: number`, epoch en segundos). Si estás por agregar un `await` o un
import de `packages/db` en `packages/core/src/deteccion/`, pará: el diseño no es ese.

## Los tres detalles que NO se arreglan

Cada uno parece un bug y es intencional. Los tres vienen del original y los tres tienen test.

1. **El tramo actual se excluye del precio habitual.** Se recorren pares de filas consecutivas
   y la ultima no tiene siguiente. Si el precio de oferta de hoy entrara, contaminaria la
   referencia contra la que se lo compara. Un off-by-one acá no falla: da numeros levemente
   mal, para siempre.
2. **En empate de duracion gana el precio mas viejo.** Iterar el `Map` en orden de insercion con
   `>` **estricto**. Con `>=` gana el mas nuevo y cambia el resultado.
3. **`Math.floor(otros.length / 10)`** es division entera: con 8 comparables da indice 0, el
   minimo, no "el percentil 10". No lo interpoles.

Y uno mas: **las unidades "Und" se descartan a proposito** en el parser de presentacion. Un
paquete de 150 servilletas y una pizza son los dos "1 Und". No agregues unidades al diccionario.

## La estructura de `evaluarReglas` es parte del contrato

```
promo excluida            -> corta
precio <= precio_absurdo  -> devuelve SOLO ese hit y corta
luego acumula:
  caida_vs_historial
  descuento_extremo  XOR  gran_descuento     <- if/else if, INTENCIONAL
  vs_otras_tiendas
  nuevo_vs_pasillo   (solo si habitual === null)
```

`gran_descuento` es la unica que exige `estadoOferta === 'real'`. Es la que reporta ofertas
genuinas, asi que un tachado inflado no debe dispararla.

## Para agregar una regla

1. **La definicion va solo en `packages/core/src/reglas/registry.ts`** (regla de oro 10): clave,
   umbral default, titulo, emoji, orden de prioridad, `evaluar`, `formatear`.
2. Agregar el valor al enum `regla_clave` en una migracion. `npm run reglas:verificar` falla en
   CI si el enum y el registry no coinciden.
3. Agregarla al default de `suscripciones.reglas_habilitadas` solo si querés que este prendida
   para todos.
4. **Los tests primero, y que fallen** (`superpowers:test-driven-development`).
5. La lint rule `no-clave-regla-literal` prohibe escribir la clave como string fuera de
   `packages/core/src/reglas/`. Si te molesta, es porque estás escribiendo en el lugar
   equivocado.

## Para cambiar un umbral

Un umbral mas laxo no es gratis: **cada falso positivo cuesta la confianza del usuario**, y dos
o tres y se ignoran todas las alertas. Antes de bajar un umbral, corré
`npm run corrida:offline` y mirá cuantos hallazgos mas aparecen y si son buenos.

## Tests obligatorios

Los casos sinteticos viven en `fixtures/rappi/casos/`. El que no puede faltar:

```
$700 x 30 dias -> $1400 x 3 dias -> $700 hoy   =>  "inflado"
```

Si eso da `real`, el precio habitual no esta ponderando por duracion y todo el proyecto miente.

Mas: empate de duracion, exactamente 8 comparables, historial vacio o de una sola fila, todo
sin stock, precio 0 (¿divide por cero en algun ratio?), y reajustes de ±2% colapsando a un tramo.

## La revision adversarial es obligatoria

Cualquier cambio a umbrales, logica de reglas o anti-spam. Mejor en otra sesion.
Ver [`specs/_plantilla/05-revision-adversarial.md`](../../../specs/_plantilla/05-revision-adversarial.md).
