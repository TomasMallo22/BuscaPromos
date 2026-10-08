-- 0009 — Catalogo: proveedores, tiendas y productos.
--
-- Numerada despues de la 0008 a proposito: la 0008 hace `revoke all on all tables in schema
-- public from anon, authenticated`, asi que toda tabla creada antes en orden de archivo perderia
-- sus grants en un `db reset`. Ver specs/001-rappi-end-to-end/02-diseno.md.
--
-- Ninguna PK es `(tienda, producto)` a secas: todo cuelga de `tiendas.id`, que cuelga de un
-- proveedor (regla de oro 9). Dos proveedores con el mismo id externo no colisionan nunca.

-- Las policies llaman a `private.usuario_ve_tienda()`. Para ejecutar una funcion hace falta
-- USAGE sobre su schema, y la 0001 se lo saco a `authenticated`. Darselo no expone nada:
-- PostgREST solo publica `public`, y en `private` solo hay funciones con su propio grant.
grant usage on schema private to authenticated;

-- ---------------------------------------------------------------------------
-- proveedores: una fila por fuente de precios
-- ---------------------------------------------------------------------------
-- Las politicas (faltanteEsSinStock, promoKindsExcluidos...) NO van aca: viven en
-- packages/providers/src/<id>/politicas.ts y son la unica fuente.
create table public.proveedores (
  id        text primary key,            -- 'rappi', 'jumbo'...
  tipo      tipo_proveedor not null,
  nombre    text not null,
  creado_at timestamptz not null default now()
);

insert into public.proveedores (id, tipo, nombre) values ('rappi', 'rappi', 'Rappi Turbo');

-- ---------------------------------------------------------------------------
-- tiendas: lo que se recorre. Se comparte entre todos los usuarios que caen en ella
-- ---------------------------------------------------------------------------
create table public.tiendas (
  id                    uuid primary key default gen_random_uuid(),
  proveedor_id          text not null references public.proveedores(id),
  id_externo            text not null,     -- store_id de Rappi
  nombre                text,
  -- Rappi pide lat/lng en cada request de la tienda. Salen de la direccion que la resolvio,
  -- redondeadas a 3 decimales (~100 m). DATO SENSIBLE: `authenticated` NO puede leer estas dos
  -- columnas (el grant de abajo es por columna). Regla de oro 14.
  lat_consulta          double precision not null check (lat_consulta between -90 and 90),
  lng_consulta          double precision not null check (lng_consulta between -180 and 180),
  -- Lo escribe el crawler. La web lo necesita para "buscando por primera vez" y "juntando
  -- historial, dia N de 7", y `corridas` esta cerrada a `authenticated` (regla de oro 11).
  primera_corrida_ok_at timestamptz,
  ultima_corrida_ok_at  timestamptz,
  creada_at             timestamptz not null default now(),
  unique (proveedor_id, id_externo)
);

-- ---------------------------------------------------------------------------
-- productos_canonicos: la identidad que permite comparar entre tiendas
-- ---------------------------------------------------------------------------
-- Solo origen 'ean' o 'rappi_master' habilita vs_otras_tiendas (regla de oro 15).
create table public.productos_canonicos (
  id     uuid primary key default gen_random_uuid(),
  clave  text not null unique,             -- 'rm:12345', 'ean:7790040991'
  origen origen_clave not null
);

-- ---------------------------------------------------------------------------
-- productos: el catalogo de cada proveedor, sin precios
-- ---------------------------------------------------------------------------
create table public.productos (
  id             uuid primary key default gen_random_uuid(),
  proveedor_id   text not null references public.proveedores(id),
  id_externo     text not null,
  canonico_id    uuid references public.productos_canonicos(id),
  nombre         text not null,
  marca          text,
  presentacion   text,                     -- "1 x 630 mL": lo parsea packages/core
  imagen_url     text,
  -- La taxonomia NO esta fijada a dos niveles: VTEX tiene 3 o 4. El "sub-pasillo" de
  -- nuevo_vs_pasillo es un prefijo de este array, segun la politica del proveedor.
  categoria_path text[] not null default '{}',
  actualizado_at timestamptz not null default now(),
  unique (proveedor_id, id_externo)
);
create index productos_canonico on public.productos (canonico_id) where canonico_id is not null;

-- ---------------------------------------------------------------------------
-- Las FKs que la 0007 no podia tener porque `tiendas` no existia
-- ---------------------------------------------------------------------------
alter table public.direcciones_tiendas
  add constraint direcciones_tiendas_tienda_fk
  foreign key (tienda_id) references public.tiendas(id) on delete cascade;

alter table public.suscripciones
  add constraint suscripciones_tienda_fk
  foreign key (tienda_id) references public.tiendas(id) on delete cascade;

-- Rappi no tiene tienda Turbo en esa zona. Sin esto la direccion quedaria "buscando" para
-- siempre (E21 de la spec 001).
alter table public.direcciones add column sin_cobertura_at timestamptz;

-- Las direcciones que el crawler tiene que resolver en su proxima corrida.
create index direcciones_pendientes on public.direcciones (creada_at)
  where activa and resuelta_at is null and sin_cobertura_at is null;

-- ---------------------------------------------------------------------------
-- RLS y grants, en la misma migracion
-- ---------------------------------------------------------------------------
alter table public.proveedores         enable row level security;
alter table public.tiendas             enable row level security;
alter table public.productos_canonicos enable row level security;
alter table public.productos           enable row level security;

-- Catalogo sin precios: no es sensible. Lo que si lo es (que tiendas recorre cada usuario, y
-- por lo tanto por donde vive) queda en `tiendas`, que solo se ve si estas suscripto.
create policy leer_proveedores on public.proveedores for select to authenticated using (true);
create policy leer_canonicos   on public.productos_canonicos for select to authenticated using (true);
create policy leer_productos   on public.productos for select to authenticated using (true);
create policy leer_tiendas_suscriptas on public.tiendas
  for select to authenticated
  using ((select private.usuario_ve_tienda(id)));

grant select on public.proveedores, public.productos_canonicos, public.productos to authenticated;
-- Por columna: lat_consulta y lng_consulta quedan afuera a proposito (E23).
grant select (id, proveedor_id, id_externo, nombre, primera_corrida_ok_at, ultima_corrida_ok_at, creada_at)
  on public.tiendas to authenticated;

grant all on public.proveedores, public.tiendas, public.productos_canonicos, public.productos
  to service_role;
