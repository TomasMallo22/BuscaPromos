# 02 — Modelo de datos

Postgres en Supabase, region `sa-east-1`. Castellano, sin tildes en identificadores, snake_case.

**Toda tabla nueva en `public` lleva RLS y `grant` explicitos en la misma migracion.** Supabase
no los da solos. Las funciones internas van al schema `private`, porque PostgREST expone como
endpoint REST todo lo que esta en `public`.

## Las migraciones

| Archivo | Contenido |
|---|---|
| `0001_enums_y_schemas.sql` | schema `private` + los 7 enums |
| `0007_usuarios.sql` | `perfiles`, `direcciones`, `direcciones_tiendas`, `suscripciones`, `canales_notificacion` |
| `0008_rls.sql` | `private.usuario_ve_tienda()` + policies + grants |
| `0009_catalogo.sql` | `proveedores`, `tiendas`, `productos_canonicos`, `productos` |
| `0010_precios.sql` | `precios_actuales` (snapshot) + `precios_cambios` (changelog, append-only por permisos) |
| `0011_aplicar_lote.sql` | `public.aplicar_lote_precios()`, ejecutable solo por `service_role` |
| `0012_corridas.sql` | `corridas`, `credenciales_proveedor` |
| `0013_hallazgos.sql` | `hallazgos`, `alerta_estado`, `notificaciones` |
| `0014_ratio_lista.sql` | `precios_actuales.ratio_lista`: el descuento que anuncia el proveedor, para el feed |

Las 0002 a 0006 del plan original se renumeraron a 0009+: la 0008 revoca los grants de todo
`public`, y una tabla creada antes en orden de archivo los perderia en un `db reset`.

## Los cinco problemas del repo original, y como se resuelven

El repo de `ivokalaizic/rappi-turbo-radar` tiene cinco limitaciones estructurales que impiden
el multi-proveedor. Estan resueltas desde el dia 1, porque arreglarlas despues implica migrar
todo el historial.

### 1. No existia la dimension proveedor

Ahi todo era `PRIMARY KEY (store_id, product_id)`. Nada impide que PedidosYa tenga un
`store_id` 900 igual que Rappi.

**Solucion:** no existe ninguna PK `(tienda, producto)`. Todo cuelga de `tiendas.id` (uuid), que
cuelga de `proveedor_id`. Dos proveedores con el mismo `id_externo` no colisionan nunca.

### 2. `master_product_id` es una identidad propietaria de Rappi

Es lo que hace funcionar `vs_otras_tiendas`. Cross-proveedor no existe equivalente.

**Solucion:** `productos_canonicos`, con una `clave` y un `origen`:

| origen | clave | ¿habilita `vs_otras_tiendas`? |
|---|---|---|
| `ean` | `ean:7790040991` | **si** |
| `rappi_master` | `rm:12345` | **si** |
| `nombre_marca_presentacion` | `nmp:sancor\|yogur\|1x900g` | **no** |

El fuzzy por nombre juntaria "Yogur Ser Frutilla 190g" con "...190g x4" y produciria la peor
clase de falso positivo: convincente. Regla de oro 15. Mejor perder una regla.

### 3. La taxonomia estaba fijada a dos niveles

`aisle` + `subaisle` como columnas TEXT. VTEX tiene 3 o 4 niveles.

**Solucion:** `categoria_path text[]`. El "sub-pasillo" de `nuevo_vs_pasillo` no es un campo:
es `categoria_path[1:nivelAgrupacionPasillo]`, una politica por proveedor. `min_comparables`
tambien es por proveedor, porque una taxonomia mas fina cambia el comportamiento de la regla.

### 4. `global_offer` cargaba dos significados

Era a la vez "es una promo" y "esta promo no me aplica, excluila de todo".

**Solucion:** enum `promo_kind` + `promoKindsExcluidos` por proveedor. **"Excluir" son cuatro
cosas, y hay que aplicarlas en los cuatro lados**: no entra al precio habitual, ni a la mediana
cross-tienda, ni al indice de pasillo, ni genera alerta.

### 5. Las claves de regla eran strings libres

`'caida_vs_historial'` estaba escrito en 5 archivos distintos.

**Solucion:** enum `regla_clave`, generado desde el registry TS, con `reglas:verificar` en CI.

## Enums (`0001`)

```sql
create schema if not exists private;
revoke all on schema private from anon, authenticated;
grant usage on schema private to service_role;

create type public.tipo_proveedor as enum
  ('rappi','vtex','coto','laanonima','sepa','pedidosya');

create type public.promo_kind as enum (
  'ninguna',
  'descuento_lista',        -- precio tachado del retailer
  'promo_usuario_nuevo',    -- Rappi: has_global_offers + max_quantity = 1
  'segunda_unidad',
  'descuento_bancario',
  'combo',
  'precio_cuidado',
  'desconocida');

create type public.estado_oferta as enum ('real','inflado','sin_historial');

create type public.regla_clave as enum (
  'precio_absurdo','caida_vs_historial','descuento_extremo',
  'gran_descuento','vs_otras_tiendas','nuevo_vs_pasillo',
  'promo_usuario_nuevo');

create type public.origen_clave as enum ('ean','rappi_master','nombre_marca_presentacion');
create type public.estado_corrida as enum ('en_curso','ok','descartada','error');
create type public.tipo_canal as enum ('telegram','email','web');
```

## Precios: snapshot + changelog (`0003`)

```sql
create table public.precios_actuales (
  tienda_id    uuid not null references public.tiendas(id) on delete cascade,
  producto_id  uuid not null references public.productos(id) on delete cascade,
  precio       numeric(12,2) not null,
  precio_lista numeric(12,2),
  promo_kind   promo_kind not null default 'ninguna',
  en_stock     boolean not null,
  stock        integer,
  visto_at     timestamptz not null,
  cambio_at    timestamptz not null,
  primary key (tienda_id, producto_id)
);

-- UNA fila solo cuando cambia (precio, precio_lista, promo_kind, en_stock)
create table public.precios_cambios (
  id           bigserial primary key,
  tienda_id    uuid not null references public.tiendas(id) on delete cascade,
  producto_id  uuid not null references public.productos(id) on delete cascade,
  ts           timestamptz not null,
  precio       numeric(12,2) not null,
  precio_lista numeric(12,2),
  promo_kind   promo_kind not null,
  en_stock     boolean not null
);
create index precios_cambios_serie on public.precios_cambios (tienda_id, producto_id, ts);
```

**`precios_cambios` es append-only.** Nunca `update`, nunca `delete` (salvo la retencion de 90
dias de la spec 003). Es la regla de oro 2 y lo que evita que la base explote: con un snapshot
por corrida serian `6000 productos x 16 corridas/dia x 30 dias = 2.9M filas/mes por tienda`.
Con changelog son decenas de miles.

## `aplicar_lote_precios` (`0004`) — la pieza clave

6000 upserts individuales contra São Paulo es inviable. Una sola funcion hace el changelog, el
snapshot y **devuelve el set de cambiados**, que es exactamente la capa 1 del anti-spam:

```sql
create or replace function private.aplicar_lote_precios(
  p_tienda_id uuid,
  p_ts        timestamptz,
  p_filas     jsonb   -- [{producto_id, precio, precio_lista, promo_kind, en_stock, stock}]
) returns table (producto_id uuid, motivo text)
language plpgsql security definer set search_path = public, private as $$
...
$$;
```

Se llama en chunks de ~500. Atomico por chunk. `motivo` es `'nuevo'` o `'cambio'`.

La ventaja no es solo performance: **la invariante "changelog, no snapshot" queda forzada en un
solo lugar**, en vez de depender de que el crawler se acuerde de respetarla.

## Corridas y guardas (`0005`)

```sql
create table public.corridas (
  id                  uuid primary key default gen_random_uuid(),
  tienda_id           uuid not null references public.tiendas(id) on delete cascade,
  inicio              timestamptz not null default now(),
  fin                 timestamptz,
  estado              estado_corrida not null default 'en_curso',
  productos_vistos    integer not null default 0,
  productos_conocidos integer not null default 0,
  grupos_fallidos     text[] not null default '{}',
  descartada_motivo   text,
  commit_sha          text,
  app_version         text
);
```

`app_version` por corrida es deliberado: cuando Rappi rompa, el historico de este campo dice
cual fue la ultima version que funcionaba.

**Guarda de completitud.** Si `productos_vistos < 0.5 * productos_conocidos`, **o**
`productos_vistos < 100` (piso absoluto: una tienda de 60 productos que trae 31 pasa el 50% y
marcaria 29 como desaparecidos), la corrida se marca `descartada` y no genera nada.

**`grupos_fallidos`** es el set `failed` del original: si un sub-pasillo fallo, sus productos
**no** se marcan sin stock. El error de red no es evidencia (regla de oro 7).

## Hallazgos y anti-spam (`0006`)

`hallazgos` guarda el resultado **ya calculado**: `precio`, `precio_referencia`, `ratio`
(`precio / referencia`, menor es mejor), `estado_oferta` y un `detalle jsonb`. La web lee esto;
no recalcula nada (regla de oro 11).

`alerta_estado` con PK `(tienda_id, producto_id, regla)` es el "hallazgo vigente" de las capas
2 y 3. `notificaciones` con `unique (hallazgo_id, usuario_id, canal)` es la capa 5.

## Multiusuario (`0007`)

```
perfiles              preferencias: horario silencioso, tope de alertas por hora
direcciones           usuario_id, etiqueta, texto, lat, lng    <- el dato que el dueño pidio
direcciones_tiendas   que tienda resolvio cada direccion, por proveedor
suscripciones         usuario x tienda + reglas_habilitadas, ratio_maximo, categorias_excluidas
canales_notificacion  telegram/email + destino + verificado + token_vinculacion
```

`direcciones` y `tiendas` son tablas separadas a proposito: en el original estaban fusionadas,
lo que impedia que una misma direccion tuviera tienda en Rappi **y** en otro proveedor a la vez.

## RLS (`0008`)

```sql
create or replace function private.usuario_ve_tienda(p_tienda_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.suscripciones s
                 where s.tienda_id = p_tienda_id and s.usuario_id = auth.uid() and s.activa);
$$;
```

Se usa envuelta en `(select ...)` dentro de las policies, para que Postgres la cachee como
InitPlan y no la evalue por fila.

| Grupo | Policy |
|---|---|
| Datos del usuario (`perfiles`, `direcciones`, `suscripciones`, `canales_notificacion`) | solo el dueño, `using` y `with check` por `auth.uid()` |
| Datos de scrapeo (`hallazgos`, `precios_*`, `tiendas`) | lectura solo de tiendas suscriptas; escritura solo `service_role` |
| `productos`, `productos_canonicos` | lectura libre: es catalogo sin precios, no es sensible |
| `corridas`, `alerta_estado` | **sin policy** para `authenticated`: internos del motor |

`corridas` y `alerta_estado` sin policy de lectura es deliberado. Si PostgREST no los expone,
no hay que pensar en ellos.

**Se verifica con dos JWT reales de dos usuarios distintos, nunca con `service_role`** — que
por definicion saltea RLS y haria pasar un test que no prueba nada. Ver
[`10-seguridad-rls.md`](10-seguridad-rls.md).
