# 09 — Fixtures y probe: desarrollar sin red

## Por que existe esto

La red del contenedor de desarrollo esta cerrada (ver
[`../.llm-wiki/wiki/bloqueos.md`](../.llm-wiki/wiki/bloqueos.md)). Pero incluso si se abriera,
el esquema de fixtures se construye igual, por tres razones que no desaparecen:

1. **Los tests tienen que correr sin red.** Un CI que depende de que Rappi este arriba es un
   generador de ruido: falla por motivos que no son el codigo.
2. **La IP del contenedor no es la de Actions.** "Rappi no bloquea IPs de datacenter de GitHub
   Actions" vale para Actions. La validacion real pasa por Actions de todos modos.
3. **El fixture es documentacion ejecutable.** Cuando Rappi cambie el layout en seis meses, el
   diff entre el fixture viejo y la captura nueva dice **exactamente** que se movio.

## El workflow `probe`

`workflow_dispatch` con inputs: `proveedor`, `dominio` (para VTEX), `lat`, `lng`, `pasos`
(csv: `passport,guest,stores,aisles,subaisles,detail`), `aisle_id`, `sub_aisle_id`, `paginas`,
`app_version`.

```
npm run probe   -> probes/crudo/
npm run redactar probes/crudo probes/limpio
npm run redactar:verificar probes/limpio     <- FALLA el job si queda algo
upload-artifact  probes/limpio, retention-days: 7
npm run probe:resumen >> $GITHUB_STEP_SUMMARY
```

Detalles que importan:

- **`probes/` esta en `.gitignore`.** La captura cruda nunca llega a git.
- **Redactar y verificar son dos pasos separados.** `redactar:verificar` falla si encuentra algo
  que parezca un JWT, un `Bearer`, un `x-guest-api-key` o el `deviceid`. Dos pasos y no uno,
  porque el que redacta y el que verifica se escriben con criterios distintos; si el mismo
  codigo hace las dos cosas, un bug pasa desapercibido.
- **`PROBE_DEVICE_ID` va como secret**, no un uuid nuevo por run.
- **`retention-days: 7`**: el artifact tiene el catalogo de una tienda, que es dato de un
  tercero. No hay razon para guardarlo mas.
- **El resumen al `GITHUB_STEP_SUMMARY`** dice cuantos productos, cuantos con `real_price`,
  cuantos con `has_global_offers`, que pasillos vinieron vacios. Asi se ve si el probe sirvio
  sin bajar el artifact.

## La estructura de `fixtures/`

```
fixtures/rappi/
├── manifest.json
├── red/                                    <- capturas reales, redactadas
│   ├── passport.json
│   ├── guest-token.json
│   ├── stores-router-principal--caba.json
│   ├── aisles-tree.json
│   ├── sub-aisles--<aisle_id>.json
│   ├── aisle-detail--<sub_aisle_id>--offset-0.json
│   └── aisle-detail--<sub_aisle_id>--offset-50.json
└── casos/                                  <- series de precios SINTETICAS, a mano
    ├── inflado-sube-y-baja.json            # $700 -> $1400 (3d) -> $700  => inflado
    ├── real-caida-sostenida.json           # $700 x 25d -> $400          => real
    ├── sin-historial-corto.json            # 3 dias de historial         => sin_historial
    ├── oferta-permanente.json              # 7+ dias al mismo precio     => inflado
    ├── reajustes-dos-por-ciento.json       # 700,712,698,705 colapsan a un tramo
    ├── empate-de-duracion.json             # dos precios igual duracion: gana el mas viejo
    └── pasillo-comparables.json            # indice de sub-pasillo, 7 vs 8 comparables
```

**`red/` se captura. `casos/` se diseña.** Los casos no son capturas: son series de precios
escritas a mano para ejercitar el motor de deteccion. **No necesitan red y nunca la
necesitaron**, asi que son lo primero que se puede escribir.

## El manifest

```json
{
  "proveedor": "rappi",
  "capturas": [{
    "clave": "aisle_detail:112233:offset=0",
    "archivo": "red/aisle-detail--112233--offset-0.json",
    "metodo": "POST",
    "url": "https://services.rappi.com.ar/api/web-gateway/web/dynamic/context/content/",
    "capturado_at": "2026-10-08T14:02:11Z",
    "app_version": "web_v1.223.2",
    "run_id": "1234567890",
    "sha256": "...",
    "redactado": true,
    "productos": 50
  }]
}
```

`clave` es como `ClienteFixtures` resuelve el request. `capturado_at` y `app_version` son lo
que convierte el fixture en evidencia fechada.

## Los comandos

| Comando | Que hace |
|---|---|
| `npm run fixtures:verificar` | revalida cada captura contra su zod schema y su `sha256`. Corre en CI |
| `npm run fixtures:promover -- ~/Downloads/probe-rappi-123` | mueve un artifact bajado a `red/`, actualiza el manifest, **imprime el diff** |
| `npm run corrida:offline` | corrida completa con deteccion, contra fixtures, sin red, sin escribir |

`corrida:offline` es el comando de todos los dias.

Si `fixtures:verificar` falla despues de promover una captura nueva, eso **es la señal**: Rappi
cambio algo, y el error dice que campo. Ese diff va a
[`../.llm-wiki/wiki/bitacora-api.md`](../.llm-wiki/wiki/bitacora-api.md).

## El orden de trabajo de la spec 001

Con la red cerrada se puede avanzar ~65%:

| # | Que | Red | % |
|---|---|---|---|
| 1 | `packages/core`: motor, tests portados, registry, parser, con `casos/` | no | ~40% |
| 2 | migraciones + `aplicar_lote_precios` + `packages/db`, contra `supabase start` (docker local) | no | ~25% |
| 3 | contrato, `ClienteHttp`, `ClienteFixtures`, cliente de Rappi contra fixtures a mano | no | |
| 4 | `probe` → fixtures reales → los tests pasan de "contra lo que creo" a "contra lo que es" | Actions | |
| 5 | `corrida-seca.yml` contra un Supabase de staging | Actions | |
| 6 | `corrida.yml` a produccion | Actions | |
