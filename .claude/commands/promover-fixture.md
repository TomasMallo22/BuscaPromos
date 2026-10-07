---
description: Promover un artifact del probe a fixtures/ y registrar que cambio
---

Promové el artifact: $ARGUMENTS

1. `npm run fixtures:promover -- <ruta del artifact bajado>`.
2. **Leé el diff que imprime.** Es lo mas importante de todo esto: dice exactamente que campo
   se movio respecto del fixture anterior.
3. `npm run fixtures:verificar`. Si falla, no aflojes el zod schema para que pase: la API
   cambio, y el schema estricto es justamente lo que hizo que te enteres hoy y no en tres
   semanas. Arreglá el parser con un test que falle primero.
4. Confirmá que el manifest quedo con `capturado_at`, `app_version` y `sha256`.
5. **Revisá que no quedo ningun token, `Bearer`, `x-guest-api-key` ni `deviceid`** en lo que vas
   a commitear. El repo es publico.
6. Entrada en `.llm-wiki/wiki/bitacora-api.md` con el diff como evidencia, si cambio algo.
7. `npm run corrida:offline` para confirmar que la corrida completa sigue andando contra los
   fixtures nuevos.
