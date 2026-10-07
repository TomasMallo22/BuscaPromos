# 03 — Motor de deteccion

El corazon del proyecto. Es un port a TypeScript de `turbo/detect.py` y de las funciones de
calculo de `turbo/db.py` de `ivokalaizic/rappi-turbo-radar` (commit `431cb3f`).

Vive en `packages/core`. **No toca la red, no toca la DB, no hace I/O.** Recibe datos, devuelve
hallazgos. El reloj se inyecta (`ahora: number`, epoch en segundos) para que los tests sean
deterministas.

## La idea en una frase

No se le cree al precio tachado del retailer. La referencia es **el precio habitual propio**,
calculado como la moda ponderada por duracion del historial.

## 1. Precio habitual — `precioHabitual`

El precio que estuvo **mas tiempo vigente** en la ventana de `historial_dias`. No el promedio,
no la mediana.

```
desde = ahora - dias * 86400
sostenido = Map<precio, segundos>
para cada par (fila, siguiente) de filas consecutivas:      <- el ultimo tramo queda afuera
    si fila.promoExcluida o no fila.enStock: continuar      <- las promos que no aplican no cuentan
    inicio = max(fila.ts, desde)
    si siguiente.ts > inicio:
        sostenido[fila.precio] += siguiente.ts - inicio
devolver el precio con mas segundos, o null si no hay ninguno
```

**Por que el promedio no sirve:** un producto que vale $700 hace un mes y hoy esta a $400 tiene
promedio $690 y pico. La moda ponderada dice $700, que es la respuesta correcta a "¿cuanto vale
normalmente?".

**Tres detalles que no son casualidad** (cada uno tiene su test):

1. **El tramo actual se excluye a proposito.** Se recorren pares `(fila, siguiente)`, y la
   ultima fila no tiene siguiente. Si el precio de oferta de hoy entrara en el calculo, se
   contaminaria la referencia contra la que se lo compara. Un off-by-one aca rompe todo **en
   silencio**: no falla, da numeros levemente mal.
2. **En empate gana el precio mas viejo.** En Python, `max(held, key=held.get)` sobre un dict
   con orden de insercion devuelve el primero insertado. En TypeScript hay que iterar el `Map`
   en orden de insercion comparando con `>` **estricto**, nunca `>=`.
3. **Se descartan los tramos sin stock y los de promo excluida.** Un producto agotado no tiene
   precio vigente, y una promo que no le aplica al usuario no es su precio.

## 2. Estado de la oferta — `estadoOferta`

Clasifica el precio actual en `real` | `inflado` | `sin_historial`. Es la pieza conceptual.

```
actual = filas[ultima].precio
i = ultima
mientras i > 0 y |filas[i-1].precio - actual| / actual <= 0.02:   <- colapsa reajustes de +-2%
    i -= 1
desde = filas[i].ts

si ahora - desde >= oferta_permanente_dias (7):
    -> "inflado"        ya cuesta lo mismo hace una semana: ese ES su precio normal
si i == 0 o desde - filas[0].ts < oferta_min_historial_dias (7):
    -> "sin_historial"  no hay cambio anterior, o el historial previo es demasiado corto
ref = precioHabitual(filas[0..i], historial_dias, desde)    <- OJO: la ventana se evalua AL MOMENTO
                                                               del cambio, no en `ahora`
si ref es null:
    -> "sin_historial"
-> actual <= ref * (1 - oferta_real_baja (0.15)) ? "real" : "inflado"
```

`SAME_PRICE = 0.02` existe porque los retailers mueven miles de precios +-1-2% por dia. Sin
ese colapso, cada reajuste cosmetico reiniciaria el reloj de "desde cuando cuesta esto".

### El caso que justifica todo el diseño

Truco clasico: subir el precio y despues "rebajarlo" a lo que costaba.

```
dia -30:  $700      el precio de siempre
dia  -5:  $1400     lo suben
dia  -2:  $700      lo "rebajan" y le ponen un cartel de -50%
```

Resultado correcto: **`inflado`**. Funciona porque `precioHabitual` pondera por duracion: los
25 dias a $700 pesan mucho mas que los 3 dias a $1400, asi que `ref = 700`, y
`700 <= 700 * 0.85` es falso. Si la referencia fuera el promedio o el ultimo precio, esto daria
`real` y mandariamos una alerta por nada.

Este caso tiene test (`fixtures/rappi/casos/inflado-sube-y-baja.json`) y es el primero que hay
que hacer pasar al portar.

## 3. Las reglas — `evaluarReglas`

**La estructura importa tanto como los umbrales.** Hay dos cortes tempranos y despues una
acumulacion, con un `else if` que es intencional.

```
si producto.promoExcluida:                     <- promo de usuario nuevo de Rappi
    (opcionalmente un hit `promo_usuario_nuevo`) y CORTA

si precio <= precio_absurdo ($10):
    devuelve SOLO ese hit y CORTA               <- $0 o $1: no hace falta mas analisis

hits = []
si habitual y precio/habitual <= caida_vs_historial (0.5):      -> caida_vs_historial
si lista > 0 y precio/lista <= descuento_extremo (0.2):         -> descuento_extremo
SI NO, si lista > 0 y precio/lista <= gran_descuento (0.5)
        y estadoOferta == "real":                               -> gran_descuento
si mediana y precio/mediana <= vs_otras_tiendas (0.5):          -> vs_otras_tiendas
si habitual es null y hay referencia de pasillo
        y precio/ref <= nuevo_vs_pasillo (0.2):                 -> nuevo_vs_pasillo
```

`descuento_extremo` y `gran_descuento` son **mutuamente excluyentes** (`else if`): un producto
al 15% del tachado ya disparo la regla fuerte, no tiene sentido tambien reportarlo como "oferta
fuerte". **No lo "arregles".**

`gran_descuento` es la unica regla que exige `estadoOferta == "real"`: es la que reporta ofertas
genuinas en vez de errores, asi que un tachado inflado no debe dispararla.

`nuevo_vs_pasillo` corre **solo** si no hay historial propio (`habitual === null`). Es la red
para productos nuevos, que es justo cuando las demas reglas no pueden opinar.

### Tabla de reglas

| Regla | Dispara cuando | Default | Referencia |
|---|---|---|---|
| `precio_absurdo` | precio <= $X | 10 | — |
| `caida_vs_historial` | precio <= X x precio habitual | 0.5 | historial propio |
| `descuento_extremo` | precio <= X x precio de lista | 0.2 | tachado del retailer |
| `gran_descuento` | precio <= X x lista **y** oferta real | 0.5 | tachado + historial |
| `vs_otras_tiendas` | precio <= X x mediana en otras tiendas | 0.5 | otras tiendas |
| `nuevo_vs_pasillo` | sin historial: precio/kg <= X x percentil 10 del sub-pasillo | 0.2 | la gondola |

## 4. Producto nuevo vs. su gondola — `nuevo_vs_pasillo`

Para productos sin historial propio: comparar su precio por kilo o litro contra los mas baratos
de su sub-pasillo.

**Parseo de la presentacion.** Regex anclado sobre `"1 X 473 mL"` → `("ml", 473)`,
`"3 X 324 g"` → `("g", 972)`. Unidades: `g`/`gr` x1, `kg` x1000, `ml`/`cc` x1, `l`/`lt` x1000.

**Solo peso y volumen.** Las "Und" se descartan **a proposito**: un paquete de 150 servilletas
y una pizza son los dos "1 Und" y no son comparables. Si la presentacion no matchea el regex,
la regla no corre para ese producto. **No lo "arregles" agregando unidades.**

**El indice.** `{(sub-pasillo, dimension) -> [precios por unidad, ordenados]}`, solo con
productos en stock, sin promo excluida y con precio > 0.

**La referencia.** Se saca el propio producto del array (una sola ocurrencia, en la posicion
que da la busqueda binaria), se exige `>= min_comparables` (8), y la referencia es:

```
otros[Math.floor(otros.length / 10)] * cantidad
```

O sea: *lo que costaria este producto si tuviera el precio por unidad de los mas baratos de su
gondola.*

**`Math.floor(n / 10)` es division entera, y con exactamente 8 comparables da indice 0**, que
es el minimo, no "el percentil 10". Es intencional y esta asi en el original. **No lo
"arregles" con interpolacion**: cambiaria el comportamiento de la regla sin que ningun test
lo note.

## 5. Anti-spam — 5 capas

El problema no obvio de cualquier monitor de precios: con corridas cada 15 minutos, la misma
oferta se detecta 96 veces por dia.

| # | Capa | Donde |
|---|---|---|
| 1 | Solo se evaluan productos **nuevos o que cambiaron** | el `RETURNING` de `aplicar_lote_precios` |
| 2 | `alerta_estado` guarda el precio ya avisado; re-alerta **solo si bajo mas de 5%** | `guardarAlerta` |
| 3 | Cierre con **histeresis**: el estado vigente se borra solo si el precio subio mas que el margen | `cerrarAlertas` |
| 4 | Dedupe por producto al notificar: un producto avisa **una vez**, con la regla de mejor ratio | `notificar` |
| 5 | Por usuario: `unique (hallazgo, usuario, canal)` + horario silencioso + tope por hora | `notificaciones` |

La capa 3 es la menos obvia y la mas necesaria: sin histeresis, un precio oscilando +-1%
alrededor del umbral abre y cierra el hallazgo en loop, y cada apertura es una alerta. Tiene
test con 20 corridas simuladas.

La capa 5 no existia en el repo original porque era monousuario. Resuelve un caso concreto:
**el amigo que se suma hoy no recibe de golpe los 40 hallazgos vigentes** — solo los
detectados despues de su suscripcion.

## 6. Defaults

Viven **solo** en `packages/core/src/reglas/registry.ts`. De ahi salen el enum de Postgres, los
titulos de Telegram, los chips de la UI y los defaults de `suscripciones.reglas_habilitadas`.

```ts
precio_absurdo: 10,            caida_vs_historial: 0.5,
descuento_extremo: 0.2,        gran_descuento: 0.5,
vs_otras_tiendas: 0.5,         nuevo_vs_pasillo: 0.2,
historial_dias: 14,            realertar_si_baja: 0.05,
oferta_permanente_dias: 7,     oferta_min_historial_dias: 7,
oferta_real_baja: 0.15,        MISMO_PRECIO: 0.02,
min_comparables: 8,
```

`npm run reglas:verificar` compara `Object.keys(REGISTRY)` contra
`select enum_range(null::regla_clave)` y falla en CI si hay deriva. Una lint rule
(`no-clave-regla-literal`) prohibe escribir `'caida_vs_historial'` como string fuera de
`packages/core/src/reglas/`.

## 7. El arranque ciego

Consecuencia directa del diseño, y la expectativa mas importante a manejar:

**durante los primeros 7 a 14 dias el sistema casi no detecta nada.** `caida_vs_historial`
necesita `historial_dias` de historia, y `estadoOferta` necesita `oferta_min_historial_dias`.
Antes de eso solo pueden disparar `precio_absurdo`, `descuento_extremo` y `nuevo_vs_pasillo`
(y `vs_otras_tiendas` cuando haya dos tiendas, que llega en la spec 004).

No esta roto. Esta juntando historial. El feed muestra "juntando historial, dia 3 de 7".
