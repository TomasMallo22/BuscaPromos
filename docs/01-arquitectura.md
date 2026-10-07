# 01 — Arquitectura

## Los tres planos

La idea central: **el scrapeo no sabe que existen usuarios.** Eso es lo que hace que sumar
gente sea gratis.

```
  1. RESOLUCION              2. SCRAPEO                 3. NOTIFICACION
     (por direccion,            (por tienda,               (por usuario,
      cuando el usuario          cada 15-30 min)            despues de cada corrida)
      carga una)

  usuario agrega             crawler itera las          hallazgos nuevos
  una direccion              tiendas con al menos         |
     |                       una suscripcion activa       join suscripciones
     resolverTiendas(           |                         (reglas, ratio, categorias)
       lat, lng)                recorre el catalogo        |
     |                          |                         join canales verificados
     upsert en `tiendas`        aplica el lote            |
     por (proveedor,            (changelog + snapshot      insert en `notificaciones`
          id_externo)            + set de cambiados)       |
     |                          |                         Telegram
     escribe                    evalua SOLO los
     `direcciones_tiendas`      cambiados
     y `suscripciones`          |
                                escribe `hallazgos`
                                y `alerta_estado`
```

Dos usuarios del mismo barrio resuelven al mismo `store_id` de Rappi, y el
`unique (proveedor_id, id_externo)` los colapsa en **una** fila de `tiendas`. Una corrida, N
notificaciones.

## Donde corre cada cosa

| Pieza | Donde | Por que |
|---|---|---|
| UI | Vercel (Next 15, App Router) | Lo pidio el dueño; mobile-first, se entra desde el celular |
| Webhook de Telegram | Vercel, `app/api/telegram/webhook` | Un route handler, sin proceso vivo ni polling |
| Base, auth | Supabase `sa-east-1` | RLS resuelve el multiusuario sin escribir un backend |
| Crawler, deteccion, notificacion | GitHub Actions (cron) | Ver ADR 0002 |
| Deteccion (la libreria) | `packages/core`, compartida | Ver ADR 0001 |

**Por que no Vercel Cron:** en el plan Hobby el cron minimo es una vez por dia y la funcion
corta a 60 segundos. Una corrida de Rappi son ~120 requests paginados con delay entre medio:
2 a 4 minutos. No entra sin partirlo en cien invocaciones encadenadas con una cola, que es
exactamente la complejidad que el requisito "que sea sencillo" prohibe.

## El monorepo

```
packages/core        deteccion, registry de reglas, normalizacion, tipos del dominio
packages/providers   contrato de Proveedor + una carpeta por proveedor
packages/db          cliente, tipos generados, y TODAS las funciones de acceso a datos
apps/web             Next 15: feed, direcciones, suscripciones, vincular Telegram
apps/crawler         CLI: corrida, probe, notificar, resolver-tiendas
```

Dos reglas que lo sostienen, verificadas en CI:

- **Ningun `supabase.from(` fuera de `packages/db`.** Si la web y el crawler consultan igual,
  una sola capa tiene los tipos y las policies en la cabeza.
- **`apps/web` no importa el cliente `service_role`.** Verificado por lint, por `grep` en CI, y
  por un throw en runtime si `typeof window !== 'undefined'`. Cinturon y tiradores: el costo de
  equivocarse es filtrar la base entera.

## El flujo de datos de una corrida

1. `resolver-tiendas` ya dejo filas en `tiendas` (paso 1, raro, on-demand).
2. `corrida` toma las tiendas con suscripcion activa.
3. Por cada tienda, el proveedor devuelve un `AsyncIterable<LoteProductos>`: lotes por
   sub-pasillo, no 6000 productos en memoria.
4. Cada lote se normaliza y va a `private.aplicar_lote_precios` en chunks de ~500. Esa funcion
   inserta en `precios_cambios` **solo lo que cambio**, actualiza `precios_actuales`, y
   **devuelve el set de cambiados**.
5. **Guarda de completitud**: si se vieron menos del 50% de los productos conocidos, la corrida
   se marca `descartada` y el set de cambiados se vacia. Los precios quedan aplicados (son
   parciales, no falsos), pero no generan alertas ni "desapariciones".
6. Se evaluan **solo los cambiados** con `packages/core`. Eso es la capa 1 del anti-spam.
7. Los hallazgos van a `hallazgos` + `alerta_estado`.
8. `notificar` hace el fan-out a los usuarios suscriptos.

El detalle de cada paso esta en [`02-modelo-datos.md`](02-modelo-datos.md) y
[`03-motor-deteccion.md`](03-motor-deteccion.md).

## El entorno de desarrollo

La red del contenedor de desarrollo esta cerrada (ver
[`.llm-wiki/wiki/bloqueos.md`](../.llm-wiki/wiki/bloqueos.md)), asi que el scraper se desarrolla
contra **fixtures grabados** y se valida end-to-end en Actions. Eso no es un workaround
temporal: los tests no pueden depender de que Rappi este arriba. Ver
[`09-fixtures-y-probe.md`](09-fixtures-y-probe.md).
