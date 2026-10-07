---
description: Armar el comando para disparar el workflow probe y capturar respuestas reales de un proveedor
---

Preparame el disparo del workflow `probe` para: $ARGUMENTS

1. **Primero preguntate si hace falta.** El `probe` solo sirve para `fixtures/*/red/` (capturas
   reales de la API). Si lo que necesitás es probar el **motor de deteccion**, no hace falta red:
   se escribe un caso sintetico en `fixtures/*/casos/`. Cargá la skill `fixtures-y-probe`.
2. Decidí los inputs: `proveedor`, `dominio` (solo VTEX), `lat`, `lng`, `pasos`
   (`passport,guest,stores,aisles,subaisles,detail`), `aisle_id`, `sub_aisle_id`, `paginas`,
   `app_version`.
3. Empezá con los **pasos minimos** que responden la pregunta. `passport,guest,stores` ya dice
   si la auth y la resolucion de tienda funcionan, y es mucho mas barato que bajar un catalogo.
4. Mostrale al dueño el comando o la URL del workflow para que lo dispare, y **recordale que el
   `lat`/`lng` no se commitea en ningun lado** (regla de oro 14).
5. Cuando baje el artifact: `npm run fixtures:promover -- <ruta>`. **Mirá el diff que imprime**
   — eso es lo que cambio — y pegalo en `.llm-wiki/wiki/bitacora-api.md`.

Nunca bypasees `redactar:verificar`. Si falla, agregá el patron a `scripts/redactar.ts`.
