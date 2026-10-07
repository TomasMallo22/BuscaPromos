# Como se mantiene la .llm-wiki

Esta wiki es la memoria operativa del proyecto. Vale mas que `docs/` cuando hay conflicto:
`docs/` dice la intencion, la wiki dice la realidad.

## Cuando actualizarla

| Evento | Archivo a tocar |
|---|---|
| Se cierra una spec | `wiki/estado-actual.md` |
| Aparece o se resuelve un bloqueo | `wiki/bloqueos.md` |
| Se verifica (o se cae) un endpoint de un proveedor | `wiki/fuentes.md` + `wiki/bitacora-api.md` |
| Un `docs/` queda desactualizado y no se arregla en el acto | `wiki/docs-desactualizados.md` |
| Una API rompe y se arregla | `wiki/bitacora-api.md` |

El comando `/wiki` hace el repaso completo.

## Reglas

1. **Fecha en todo.** Cada afirmacion sobre una API externa lleva la fecha en que se verifico.
   Un endpoint "que funciona" sin fecha no sirve de nada.
2. **Evidencia, no memoria.** Si decis que Jumbo rechaza `sc` con HTTP 400, decí de donde sale
   (un run del `probe`, un fixture, un issue). Ver `superpowers:verification-before-completion`.
3. **Sin datos personales.** El repo es publico. Nunca direcciones, coordenadas reales, tokens
   ni `chat_id`. Una tienda se identifica por su `id_externo`, no por "la casa de Tomas".
4. **Breve y vigente.** Lo que ya no es cierto se borra, no se acumula. La excepcion es
   `bitacora-api.md`, que es historico a proposito: su valor esta en el registro de roturas.
5. **Si una regla de oro del `CLAUDE.md` cambia**, se actualiza ahi y se anota el por que en un
   ADR. La wiki no es el lugar para cambiar invariantes.
