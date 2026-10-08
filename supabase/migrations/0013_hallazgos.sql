-- 0013 — Hallazgos, el estado del anti-spam y las notificaciones.
--
-- `hallazgos` guarda el resultado YA calculado por el motor: la web lo lee y lo ordena, no
-- recalcula nada (regla de oro 11). Ver docs/05-alertas-y-notificaciones.md.

create table public.hallazgos (
  id                uuid primary key default gen_random_uuid(),
  tienda_id         uuid not null references public.tiendas(id) on delete cascade,
  producto_id       uuid not null references public.productos(id) on delete cascade,
  corrida_id        uuid references public.corridas(id) on delete set null,
  regla             regla_clave not null,
  precio            numeric(12,2) not null,
  precio_referencia numeric(12,2),
  ratio             numeric,                 -- precio / referencia: menor es mas fuerte
  estado_oferta     estado_oferta,
  detalle           jsonb not null default '{}',
  -- `false` en la primera corrida de una tienda: se ve en la web pero no se avisa, para que
  -- nadie reciba 40 Telegrams el primer dia (E1 de la spec 001).
  notificar         boolean not null default true,
  detectado_at      timestamptz not null default now(),
  cerrado_at        timestamptz
);
-- Un solo hallazgo abierto por (tienda, producto, regla). Re-alertar cierra el anterior.
create unique index hallazgos_uno_abierto on public.hallazgos (tienda_id, producto_id, regla)
  where cerrado_at is null;
create index hallazgos_feed on public.hallazgos (tienda_id, ratio) where cerrado_at is null;

-- El hallazgo vigente y el precio con el que se aviso. Capas 2 y 3 del anti-spam: re-alertar
-- solo si bajo mas de `realertarSiBaja`, cerrar solo si subio mas que `cerrarSiSube`.
create table public.alerta_estado (
  tienda_id      uuid not null references public.tiendas(id) on delete cascade,
  producto_id    uuid not null references public.productos(id) on delete cascade,
  regla          regla_clave not null,
  precio_avisado numeric(12,2) not null,
  hallazgo_id    uuid not null references public.hallazgos(id) on delete cascade,
  actualizado_at timestamptz not null default now(),
  primary key (tienda_id, producto_id, regla)
);

-- Capa 5: un hallazgo se manda una sola vez por usuario y canal, y es idempotente.
create table public.notificaciones (
  id          bigserial primary key,
  hallazgo_id uuid not null references public.hallazgos(id) on delete cascade,
  usuario_id  uuid not null references auth.users(id) on delete cascade,
  canal       tipo_canal not null,
  enviada_at  timestamptz,
  error       text,
  creada_at   timestamptz not null default now(),
  unique (hallazgo_id, usuario_id, canal)
);

-- ---------------------------------------------------------------------------
-- RLS y grants
-- ---------------------------------------------------------------------------
alter table public.hallazgos      enable row level security;
alter table public.alerta_estado  enable row level security;   -- sin policy: interno
alter table public.notificaciones enable row level security;

create policy leer_hallazgos on public.hallazgos
  for select to authenticated using ((select private.usuario_ve_tienda(tienda_id)));

create policy leer_propias_notificaciones on public.notificaciones
  for select to authenticated using (usuario_id = (select auth.uid()));

grant select on public.hallazgos, public.notificaciones to authenticated;

grant all on public.hallazgos, public.alerta_estado, public.notificaciones to service_role;
grant usage, select on sequence public.notificaciones_id_seq to service_role;
