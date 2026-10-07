# NNN — <titulo> · Revision adversarial

> **Obligatoria** si el cambio toca: umbrales o logica de reglas, el anti-spam, auth/RLS, o
> datos personales.
>
> **Idealmente en otra sesion que la que implemento.** Quien implemento ya decidio que esta
> bien; es el peor juez disponible.

El objetivo no es revisar estilo. Es **romperlo**.

## Como romper esto

<Un intento por hipotesis, con el resultado. No "revise y esta bien": que input concreto
probaste y que paso.>

### Intento 1 — <hipotesis>
- **Que probe:**
- **Que esperaba:**
- **Que paso:**

## Checklist por area

### Si toca el motor de deteccion
- [ ] ¿Entra el precio actual en el calculo del precio habitual? (el off-by-one silencioso)
- [ ] ¿Que pasa con empate de duracion? ¿Gana el mas viejo?
- [ ] ¿Que pasa con exactamente `min_comparables` comparables?
- [ ] ¿Que pasa con historial vacio, de una sola fila, o todo sin stock?
- [ ] ¿Un producto a precio 0 o negativo divide por cero en algun ratio?
- [ ] ¿Sigue siendo `descuento_extremo` **XOR** `gran_descuento`?

### Si toca el anti-spam
- [ ] Un precio oscilando ±1% alrededor del umbral, 20 corridas: ¿cuantas alertas?
- [ ] ¿Se puede recibir dos veces la misma alerta por dos reglas distintas?
- [ ] Un usuario que se suscribe hoy: ¿recibe los hallazgos vigentes de antes?

### Si toca RLS o auth
- [ ] Con el JWT de A, ¿se lee algo de B? (hallazgos, tiendas, precios, direcciones)
- [ ] ¿Puede A insertar una fila con `usuario_id = B`? (`with check`, no solo `using`)
- [ ] ¿Puede `authenticated` escribir en `precios_cambios`, `hallazgos` o `alerta_estado`?
- [ ] ¿`anon` lee algo?
- [ ] ¿Llego `service_role` al bundle de `apps/web`?

### Si toca un proveedor
- [ ] ¿Que pasa si la respuesta viene con un nivel mas de anidamiento?
- [ ] ¿Si un grupo falla, se marcan sus productos sin stock? (no deberia)
- [ ] ¿Si la corrida trae el 40% del catalogo, se descarta?
- [ ] ¿Se loguea algun token, `deviceid` o direccion?

### Siempre
- [ ] ¿Hay algun dato personal en el repo, en un log o en un artifact?
- [ ] ¿Hay una clave de regla escrita como string literal fuera del registry?
- [ ] ¿Hay un `supabase.from(` fuera de `packages/db`?

## Veredicto

<Lo que se encontro, y si se arreglo o quedo anotado como riesgo conocido.>
