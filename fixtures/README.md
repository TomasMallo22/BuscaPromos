# fixtures/

Dos clases de fixture, con proposito distinto. Ver
[`../docs/09-fixtures-y-probe.md`](../docs/09-fixtures-y-probe.md).

| | `<proveedor>/red/` | `<proveedor>/casos/` |
|---|---|---|
| Que es | capturas reales de la API, **redactadas** | series de precios inventadas |
| Como se obtiene | el workflow `probe` en Actions | se escriben a mano |
| Para que | tests de parsing y crawl | tests del motor de deteccion |
| Necesita red | si | **no, nunca** |

**Los `casos/` se diseñan, no se capturan.** Son lo primero que se puede escribir de cualquier
spec que toque el motor, y no dependen de que ninguna API este arriba.

## Reglas

1. **Nada sin redactar.** Las capturas crudas viven en `probes/`, que esta en `.gitignore`. Lo
   que llega acá paso por `npm run redactar` **y** por `npm run redactar:verificar`, que son dos
   pasos escritos con criterios distintos a proposito.
2. **El manifest fecha la evidencia.** `capturado_at`, `app_version`, `run_id` y `sha256`. Una
   captura sin fecha no sirve para saber si todavia refleja la API.
3. **`npm run fixtures:verificar` corre en CI** y revalida cada captura contra su zod schema y
   su hash. Si falla despues de promover algo nuevo, **eso es la señal**: la API cambio, y el
   error dice que campo.
4. Un fixture escrito a mano se marca `"sintetico": true` en el manifest. Prueba tu idea de la
   API, no la API.
