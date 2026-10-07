# .llm-wiki — punto de entrada

Leé esto **antes** de `docs/` y antes del codigo. `docs/` explica como deberia ser el
proyecto; esta wiki dice como esta hoy.

| Si querés saber… | Leé |
|---|---|
| que esta hecho y que falta | [`wiki/estado-actual.md`](wiki/estado-actual.md) |
| que esta bloqueado y por que | [`wiki/bloqueos.md`](wiki/bloqueos.md) |
| que fuentes son viables y cuales no | [`wiki/fuentes.md`](wiki/fuentes.md) |
| que `docs/` mintieron | [`wiki/docs-desactualizados.md`](wiki/docs-desactualizados.md) |
| cada vez que una API rompio | [`wiki/bitacora-api.md`](wiki/bitacora-api.md) |
| como se mantiene esta wiki | [`AGENTS.md`](AGENTS.md) |

## El proyecto en tres frases

BuscaPromos recorre catalogos de Rappi y supermercados argentinos, guarda el historial de
precios como changelog, y detecta cuando un producto esta muy por debajo de su **precio
habitual** — calculado como la moda ponderada por duracion, no como el precio tachado del
retailer, que suele estar inflado a proposito.

Avisa por Telegram y lo muestra en una web en Vercel. Es multiusuario: cada persona carga sus
direcciones, y el scrapeo es **por tienda**, no por usuario, asi que sumar gente del mismo
barrio no cuesta nada.

El motor de deteccion es un port a TypeScript del de
[`ivokalaizic/rappi-turbo-radar`](https://github.com/ivokalaizic/rappi-turbo-radar), con la
arquitectura rehecha para soportar varios proveedores y varios usuarios.
