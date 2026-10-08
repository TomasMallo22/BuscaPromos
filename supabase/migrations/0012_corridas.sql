-- 0012 — Corridas y el token de invitado cacheado.
--
-- Las dos tablas son internas del crawler: RLS habilitado y SIN policy para `authenticated`. Si
-- PostgREST no las expone, no hay que pensar en ellas. Lo que la web necesita saber de las
-- corridas esta en `tiendas.primera_corrida_ok_at` / `ultima_corrida_ok_at`.

create table public.corridas (
  id                  uuid primary key default gen_random_uuid(),
  tienda_id           uuid not null references public.tiendas(id) on delete cascade,
  inicio              timestamptz not null default now(),
  fin                 timestamptz,
  estado              estado_corrida not null default 'en_curso',
  productos_vistos    integer not null default 0,
  productos_conocidos integer not null default 0,
  productos_cambiados integer not null default 0,
  hallazgos_nuevos    integer not null default 0,
  -- El set `failed` del original: sus productos NO se marcan sin stock (regla de oro 7).
  grupos_fallidos     text[] not null default '{}',
  descartada_motivo   text,
  commit_sha          text,
  -- Cuando Rappi rompa, el historico de este campo dice cual fue la ultima version que andaba.
  app_version         text
);
create index corridas_tienda on public.corridas (tienda_id, inicio desc);

-- El token de invitado de Rappi dura 7 dias. Pedir uno por corrida serian cientos de pares
-- passport+guest por mes desde la misma IP de Actions: patron detectable. Ver docs/07.
create table public.credenciales_proveedor (
  proveedor_id   text primary key references public.proveedores(id),
  token          text not null,
  expira_at      timestamptz not null,
  actualizado_at timestamptz not null default now()
);

comment on table public.credenciales_proveedor is
  'SECRETO: tokens de los proveedores. Solo service_role. Nunca en logs.';

alter table public.corridas               enable row level security;
alter table public.credenciales_proveedor enable row level security;

grant all on public.corridas, public.credenciales_proveedor to service_role;
