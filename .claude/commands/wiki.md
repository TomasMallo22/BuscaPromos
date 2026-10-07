---
description: Repasar y actualizar la .llm-wiki con el estado real del proyecto
---

Actualizá `.llm-wiki/` para que refleje la realidad de hoy. Leé primero
`.llm-wiki/AGENTS.md`, que tiene las reglas de mantenimiento.

Repaso, en este orden:

1. **`wiki/estado-actual.md`** — ¿que se cerro desde la ultima actualizacion? ¿que falta de la
   spec en curso? ¿que sigue esperando al dueño? Mirá `git log` desde la fecha de la ultima
   actualizacion para no olvidarte de nada.
2. **`wiki/bloqueos.md`** — ¿se resolvio alguno? ¿aparecio uno nuevo? Un bloqueo resuelto se
   **borra**, no se deja tachado. Si vale como historia, va a un ADR.
3. **`wiki/fuentes.md`** — ¿se verifico en vivo algun endpoint? Actualizá la columna
   "verificado en vivo" **con la fecha**. Una afirmacion sobre una API sin fecha no sirve.
4. **`wiki/docs-desactualizados.md`** — ¿algun cambio dejo un `docs/` mintiendo? Si lo podes
   arreglar ahora, arreglalo y no lo anotes. Si no, anotalo.
5. **`wiki/bitacora-api.md`** — ¿rompio alguna API? Entrada nueva con sintoma, causa, arreglo y
   **evidencia** (el diff del fixture, el run del probe).
6. Actualizá la fecha de "Ultima actualizacion" en cada archivo que tocaste.

Reglas: fecha en toda afirmacion sobre una API externa; evidencia y no memoria; **cero datos
personales** (el repo es publico); breve y vigente — lo que ya no es cierto se borra. La
excepcion es `bitacora-api.md`, que es historico a proposito.

Si una **regla de oro** del `CLAUDE.md` cambio, se actualiza ahi y el por que va a un ADR. La
wiki no es el lugar para cambiar invariantes.
