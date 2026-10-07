# specs/ — Spec Driven Development

Todo cambio mediano o grande pasa por una spec. Los chicos (un typo, un umbral, un color) van
directo con un PR.

**¿Mediano o chico?** Si no podés decir en una frase que cambia y por que no puede romper nada
mas, es mediano. Si dudás, es mediano.

## El ciclo de vida

Una carpeta `specs/NNN-<slug>/` con seis archivos, en orden. Cada uno se completa antes de
pasar al siguiente, y cada uno puede mandar de vuelta al anterior.

| # | Archivo | Pregunta que responde | Skill |
|---|---|---|---|
| 00 | `propuesta.md` | ¿Que problema, para quien, y como sabemos que se resolvio? | `refinar-pedido` + `brainstorming` |
| 01 | `escenarios.md` | ¿Que tiene que pasar, caso por caso, incluidos los bordes? | `brainstorming` |
| 02 | `diseno.md` | ¿Como se construye, y que alternativas se descartaron? | `writing-plans` |
| 03 | `tareas.md` | ¿En que orden, y que se puede hacer sin red? | `writing-plans` |
| 04 | `verificacion.md` | ¿Como se prueba que funciona de verdad? | `verificar-antes-de-cerrar` |
| 05 | `revision-adversarial.md` | ¿Como se rompe esto? | `revision-adversarial` |

Comando: **`/nuevo-cambio`** crea la carpeta desde `_plantilla/`.

## Las reglas del ciclo

1. **La propuesta no habla de implementacion.** Si `00-propuesta.md` menciona una tabla o un
   nombre de funcion, se escribio al reves.
2. **Los escenarios se escriben antes del diseño.** Un escenario que aparece durante la
   implementacion es un escenario que no se penso, y casi siempre cambia el diseño.
3. **Las tareas dicen explicitamente que necesita red y que no.** La red del contenedor esta
   cerrada: ver [`../docs/09-fixtures-y-probe.md`](../docs/09-fixtures-y-probe.md). Una spec bien
   ordenada avanza ~65% sin red.
4. **`04-verificacion.md` se escribe antes de implementar, no despues.** Si se escribe despues,
   describe lo que se hizo en vez de lo que hacia falta.
5. **La revision adversarial la hace, idealmente, otra sesion.** Quien implemento ya decidio que
   esta bien; es el peor juez disponible.

## Cuando `05-revision-adversarial.md` es obligatoria

- Umbrales o logica de reglas de deteccion
- Cualquiera de las 5 capas de anti-spam
- Auth o RLS
- Datos personales (direcciones, `chat_id`, emails)

En este proyecto no hay plata, pero hay un equivalente: **un falso positivo cuesta la confianza
del usuario, un falso negativo cuesta la promo, y un bug de RLS expone la direccion de la casa
de alguien.**

## Estado de las specs

| Spec | Estado | Entregable |
|---|---|---|
| [`000-andamiaje`](000-andamiaje/) | en curso | el dueño se loguea desde el celular y ve una pantalla vacia |
| [`001-rappi-end-to-end`](001-rappi-end-to-end/) | **especificada**, lista para ejecutar | recibe un Telegram con una promo real y la ve en la web |

El roadmap completo esta en [`../docs/08-roadmap.md`](../docs/08-roadmap.md).

## Que pasa cuando una spec se cierra

1. `npm run verificar` verde.
2. PR mergeado.
3. **`.llm-wiki/wiki/estado-actual.md` actualizado** — comando `/wiki`. Una spec cerrada que no
   se refleja en la wiki es una spec que la proxima sesion va a volver a planificar.
4. Si quedo algun `docs/` desactualizado y no se arreglo, se anota en
   `.llm-wiki/wiki/docs-desactualizados.md`.
