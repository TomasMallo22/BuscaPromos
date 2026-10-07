---
description: Arrancar la revision adversarial de una spec: tratar de romper el cambio antes de cerrarlo
---

Revision adversarial de: $ARGUMENTS

**Cargá la skill `revision-adversarial`** y completá `05-revision-adversarial.md` de la spec.

El objetivo no es revisar estilo. Es **romperlo**. Entrá en modo de buscar el fallo, no de
confirmar que el trabajo esta bien.

Es obligatoria si el cambio toca: umbrales o logica de reglas, cualquiera de las 5 capas de
anti-spam, auth o RLS, o datos personales.

Formato: una hipotesis por intento, con **que probaste y que paso**. "Revise y esta bien" no es
evidencia de nada. Un intento que no rompe nada tambien se documenta: alguien ya probo por ahi.

La pregunta que mas rinde: **"¿que input hace que esto de un numero levemente mal, sin
fallar?"** Un crash se ve; un precio habitual 5% desviado corrompe todas las alertas en
silencio.

Si estás en la misma sesion que implemento el cambio, decilo en el veredicto: la revision vale
menos y conviene repetirla en otra sesion.
