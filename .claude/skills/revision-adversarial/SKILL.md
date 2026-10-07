---
name: revision-adversarial
description: Tratar de romper un cambio antes de cerrarlo, completando 05-revision-adversarial.md. Obligatoria si el cambio toca umbrales o logica de reglas, el anti-spam, auth o RLS, o datos personales. Usar al final de una spec, idealmente en una sesion distinta de la que implemento.
---

# Revision adversarial

**El objetivo no es revisar estilo. Es romperlo.**

Idealmente la hace otra sesion: quien implemento ya decidio que esta bien, y es el peor juez
disponible. Si tiene que ser la misma sesion, entrá explicitamente en modo de buscar el fallo,
no de confirmar el trabajo.

## Es obligatoria si el cambio toca

- Umbrales o logica de reglas de deteccion
- Cualquiera de las 5 capas de anti-spam
- Auth o RLS
- Datos personales (direcciones, `chat_id`, emails)

Acá no hay plata en juego, pero hay un equivalente: **un falso positivo cuesta la confianza del
usuario, un falso negativo cuesta la promo, y un bug de RLS expone la direccion de la casa de
alguien.**

## Como se hace

Una hipotesis por intento, con **que probaste y que paso**. No se acepta "revise y esta bien":
eso no es evidencia de nada.

```
### Intento 1 — "si el historial tiene una sola fila, estadoOferta divide por cero"
- Que probe:    serie [{ts: ahora, precio: 500}], estadoOferta(...)
- Que esperaba: "sin_historial"
- Que paso:     "sin_historial". No rompe: `i === 0` corta antes de la division.
```

Un intento que **no** rompe nada tambien se documenta. Es informacion: alguien ya probo por ahi.

## Por donde empezar a buscar

Lo que mas falla en este dominio, por experiencia del repo original:

| Area | El fallo clasico |
|---|---|
| precio habitual | el precio actual entra en su propio calculo (off-by-one silencioso) |
| empates | dos precios con igual duracion: ¿cual gana? ¿es estable entre corridas? |
| limites exactos | exactamente `min_comparables`, exactamente `oferta_permanente_dias` |
| series degeneradas | historial vacio, de una fila, todo sin stock, todo promo excluida |
| division | precio 0 o negativo en cualquier ratio |
| anti-spam | precio oscilando ±1% alrededor del umbral, 20 corridas |
| RLS | `with check` faltante: A inserta una fila con `usuario_id = B` |
| RLS | el test se escribio con `service_role`, que saltea RLS y no prueba nada |
| proveedores | la respuesta viene con un nivel mas de anidamiento |
| corridas | un grupo falla y sus productos se marcan sin stock |
| privacidad | un token, un `deviceid` o una direccion en un log o un artifact |

El checklist completo por area esta en
[`specs/_plantilla/05-revision-adversarial.md`](../../../specs/_plantilla/05-revision-adversarial.md).

## La pregunta que mas rinde

**"¿Que input hace que esto de un numero levemente mal, sin fallar?"**

Un crash se ve. Un precio habitual 5% desviado no se ve nunca, y corrompe todas las alertas en
silencio. La mayor parte del valor de esta revision esta ahi.

## El veredicto

Al final, una de tres:

1. **Nada roto.** Con los intentos documentados, para que la proxima no repita el camino.
2. **Roto y arreglado.** Con el test que lo captura, para que no vuelva.
3. **Roto y no arreglado.** Anotado como riesgo conocido, con su razon. Esto es legitimo si el
   caso es improbable y el arreglo es caro — pero tiene que estar escrito, no asumido.

Un hallazgo de seguridad **no** se cierra con la opcion 3 sin que el dueño lo decida.
