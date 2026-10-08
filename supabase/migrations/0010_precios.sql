-- 0010 — Precios: snapshot + changelog.
--
-- `precios_cambios` es la fuente de verdad (regla de oro 2): UNA fila solo cuando cambia
-- (precio, precio_lista, promo_kind, en_stock). `precios_actuales` es derivado: el ultimo
-- estado de cada producto en cada tienda. Con un snapshot por corrida serian ~2.9M filas por
-- mes por tienda; con changelog, decenas de miles. Ver docs/02-modelo-datos.md.

create table public.precios_actuales (
  tienda_id    uuid not null references public.tiendas(id) on delete cascade,
  producto_id  uuid not null references public.productos(id) on delete cascade,
  precio       numeric(12,2) not null,
  precio_lista numeric(12,2),
  promo_kind   promo_kind not null default 'ninguna',
  en_stock     boolean not null,
  stock        integer,
  visto_at     timestamptz not null,       -- la ultima corrida que lo vio
  cambio_at    timestamptz not null,       -- desde cuando esta en este estado
  primary key (tienda_id, producto_id)
);

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

comment on table public.precios_cambios is
  'APPEND-ONLY. Nunca update ni delete: es la fuente de verdad (regla de oro 2). Ni service_role puede.';

-- ---------------------------------------------------------------------------
-- RLS y grants
-- ---------------------------------------------------------------------------
alter table public.precios_actuales enable row level security;
alter table public.precios_cambios  enable row level security;

create policy leer_precios_actuales on public.precios_actuales
  for select to authenticated using ((select private.usuario_ve_tienda(tienda_id)));
create policy leer_precios_cambios on public.precios_cambios
  for select to authenticated using ((select private.usuario_ve_tienda(tienda_id)));

grant select on public.precios_actuales, public.precios_cambios to authenticated;

grant all on public.precios_actuales to service_role;
-- Append-only forzado por permisos, no por disciplina: el crawler corre como service_role y
-- no puede reescribir el historial aunque un bug lo intente. La retencion de 90 dias de la
-- spec 003 ira en una funcion de `private` con su propio dueño.
grant select, insert on public.precios_cambios to service_role;
revoke update, delete, truncate on public.precios_cambios from service_role;
grant usage, select on sequence public.precios_cambios_id_seq to service_role;
