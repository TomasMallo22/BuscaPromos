---
name: fixtures-y-probe
description: Capturar, redactar, promover o usar fixtures de respuestas de APIs en BuscaPromos, y correr el workflow probe. Usar cuando haga falta una respuesta real de un proveedor, cuando un fixture quede obsoleto, o cuando los tests de parsing fallen.
---

# Fixtures y probe

Leé [`docs/09-fixtures-y-probe.md`](../../../docs/09-fixtures-y-probe.md).

## Por que no pegas a la API desde acá

La red del contenedor esta cerrada (ver
[`.llm-wiki/wiki/bloqueos.md`](../../../.llm-wiki/wiki/bloqueos.md)). Y aunque se abra, el
esquema sigue: los tests no pueden depender de que Rappi este arriba, y la IP del contenedor
no es la de Actions.

Antes de pedirle al dueño que abra la red, mirá si lo que necesitás se puede hacer con un caso
sintetico en `casos/`. Casi siempre si.

## Las dos clases de fixture

| | `red/` | `casos/` |
|---|---|---|
| Que es | capturas reales, redactadas | series de precios inventadas |
| Como se obtiene | `probe` en Actions | se escriben a mano |
| Para que | parsing y crawl | el motor de deteccion |
| Necesita red | si | **no, nunca** |

**Los `casos/` se diseñan, no se capturan.** Son lo primero que se puede escribir de cualquier
spec que toque el motor.

## El ciclo del probe

```
1. Actions -> probe.yml (workflow_dispatch) con proveedor, lat, lng, pasos
2. el job: captura -> redacta -> VERIFICA la redaccion -> sube el artifact
3. bajar el artifact
4. npm run fixtures:promover -- ~/Downloads/probe-rappi-123
5. mirar el DIFF que imprime: eso es lo que cambio
6. pegar el diff en .llm-wiki/wiki/bitacora-api.md
```

El paso 5 es el valor real. El diff entre el fixture viejo y la captura nueva dice **exactamente**
que campo se movio.

## La redaccion no es negociable

**Redactar y verificar son dos pasos separados, escritos con criterios distintos.** Si el mismo
codigo redacta y verifica, un bug pasa desapercibido y un token llega a un artifact.

`redactar:verificar` falla el job si encuentra algo que parezca un JWT, un `Bearer`, un
`x-guest-api-key` o el `deviceid`. Si falla, **no lo bypasees**: agregá el patron a
`scripts/redactar.ts`.

`probes/` esta en `.gitignore`. La captura cruda **nunca** llega a git.

## El deviceid

`PROBE_DEVICE_ID` va como secret de Actions, no se genera por run. Un `deviceid` distinto en
cada probe es exactamente el patron que dispara anti-fraude.

## Cuando los tests de parsing fallan

Casi siempre significa una de dos cosas:

1. **El fixture se podrio**: la API cambio. Corré `probe`, promové, mirá el diff, arreglá el
   schema zod con un test que falle primero, anotá en la bitacora.
2. **Tu parser esta mal.** El fixture es la verdad.

Lo que **no** se hace: aflojar el zod schema para que pase. El schema estricto en los campos
que usamos es lo que hace que una rotura se vea el dia que pasa en vez de tres semanas despues.

## Si falta un fixture

`ClienteFixtures` lanza con el comando de `probe` exacto para capturarlo. Mientras no lo tengas,
podés escribir uno a mano a partir de la documentacion de
[`docs/04-contrato-proveedores.md`](../../../docs/04-contrato-proveedores.md) — pero marcalo en
el manifest con `"redactado": false, "sintetico": true`, porque **un fixture escrito a mano
prueba tu idea de la API, no la API.**

## Checklist

- [ ] `npm run fixtures:verificar` verde
- [ ] El manifest tiene `capturado_at`, `app_version` y `sha256`
- [ ] Ningun token ni `deviceid` en lo commiteado
- [ ] El diff quedo anotado en `.llm-wiki/wiki/bitacora-api.md`
- [ ] `npm run corrida:offline` corre de punta a punta
