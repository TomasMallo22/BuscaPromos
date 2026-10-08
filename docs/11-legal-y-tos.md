# 11 — Legal y terminos de servicio

## El riesgo, dicho claro

**Los terminos de servicio de Rappi, VTEX y Coto prohiben el scraping, aunque los endpoints
sean publicos y no requieran autenticacion.** Que un endpoint responda sin credenciales no lo
hace de uso libre.

Es un **riesgo asumido**, no un problema resuelto. Lo que se hace para mantenerlo chico:

| Mitigacion | Donde |
|---|---|
| Uso estrictamente personal: el dueño, su pareja, amigos y familia | no hay registro abierto |
| Volumen bajo: solo las tiendas que atienden a esos usuarios | `suscripciones` como entrada del crawler |
| Delays entre requests, por proveedor | `politicas.msEntreRequests` |
| Sin reventa, sin API publica, sin dataset descargable | no hay endpoint que exponga los datos |
| Headers honestos: no se falsifica ser la app oficial mas de lo necesario | `packages/providers/*/index.ts` |
| Un solo crawl por tienda, aunque la usen 10 personas | arquitectura de 3 planos |

El repo **publico** aumenta la exposicion: dice en voz alta que se scrapea. Es el costo
aceptado a cambio de minutos de Actions ilimitados. Ver ADR 0008.

## Lo que NO se hace

- No se saltean captchas ni sistemas anti-bot. Es exactamente por eso que **PedidosYa esta
  fuera de alcance** (ADR 0011): esquivar PerimeterX con stealth e IP residencial seria pasar
  de "leer un endpoint publico" a "evadir una defensa", que es otra cosa.
- No se usan cuentas de usuario ajenas ni credenciales de nadie. Todo con token de invitado.
- No se scrapea mas seguido de lo necesario. Una promo dura horas; detectarla en 30 minutos
  promedio alcanza.
- No se redistribuyen los datos.

## SEPA: la unica fuente con licencia

El **Sistema Electronico de Publicidad de Precios Argentinos** publica ZIPs diarios en
`datos.produccion.gob.ar` bajo licencia **CC-BY 4.0** de la Secretaria de Comercio Interior:
~70.000 productos, ~3.600 comercios, con precio promocional.

Es la unica fuente que **habilita** explicitamente el uso, y es la salida de largo plazo del
riesgo de ToS. Por eso la spec 005 tiene prioridad mas alta de lo que su valor inmediato
sugiere: cuanto mas del sistema se apoye en SEPA, menos depende de endpoints que nadie
autorizo.

Caveats de SEPA, para no sobrevenderla: los precios son **declarados por el comercio** y el
Estado no garantiza que sean exactos; las cadenas a veces no reportan un dia; el lag es de ~1
dia, asi que no sirve para errores de precio que duran horas. Es un buen baseline, no un
reemplazo.

## Atribucion

- El motor de deteccion es un port del de
  [`ivokalaizic/rappi-turbo-radar`](https://github.com/ivokalaizic/rappi-turbo-radar). **Hay que
  avisarle a Ivo** y acordar la atribucion antes de que el repo sea publico. Esta en los
  pendientes de [`../.llm-wiki/wiki/estado-actual.md`](../.llm-wiki/wiki/estado-actual.md).
- Los tiles de mapa de la pantalla de direcciones (spec 002) son de OpenStreetMap y **requieren
  atribucion visible**. No es opcional.
- Si se usan datos de SEPA, la licencia CC-BY pide citar la fuente.

## Si alguien pide que paremos

Si Rappi, un supermercado o cualquiera pide que se deje de acceder a sus endpoints: **se para**.
No se discute, no se busca una via alternativa. El proyecto vale menos que eso.

## Esto no es asesoramiento legal

Es el criterio con el que se tomaron las decisiones tecnicas, escrito para no re-discutirlo.
No reemplaza la opinion de un abogado.

## Volumen con los supermercados de Rappi (spec 002, 2026-10-08)

Al sumar los 8 supermercados de Rappi el volumen pasa de ~9.000 a ~26.000 requests por dia por
zona: Turbo (~190 requests) cada 30 minutos y los supermercados (~57.000 productos entre todos)
cada 4 horas. Siempre secuencial, con 600 ms entre requests, sin paralelizar. Es el cambio de
mayor exposicion de ToS del proyecto hasta ahora; si aparecen 429, se baja la cadencia, no se
agregan reintentos.
