-- 0007 — Usuarios, direcciones y suscripciones.
--
-- El requisito central del dueño: "poder elegir una direccion y que busque en base a esa
-- direccion, que no sea fijo ese dato". Por eso `direcciones` es una tabla, no una constante.
--
-- `direcciones` y `tiendas` son tablas SEPARADAS a proposito. En el repo original estaban
-- fusionadas en una sola (`locations`), y eso impedia que una misma direccion tuviera tienda en
-- Rappi Y en otro proveedor a la vez. Ver docs/01-arquitectura.md, los tres planos.
--
-- Las tablas de catalogo, precios y hallazgos llegan en la spec 001 (migraciones 0002 a 0006).
-- Esta migracion solo trae lo que auth necesita para funcionar end-to-end.

-- ---------------------------------------------------------------------------
-- perfiles: preferencias de notificacion del usuario
-- ---------------------------------------------------------------------------
create table public.perfiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  nombre              text,
  -- Horario silencioso, en hora local de Buenos Aires. Las alertas de esa franja se RETIENEN,
  -- no se descartan: quedan en la web. Capa 5 del anti-spam.
  hora_silencio_desde smallint not null default 23 check (hora_silencio_desde between 0 and 23),
  hora_silencio_hasta smallint not null default 8  check (hora_silencio_hasta between 0 and 23),
  -- Tope de alertas por hora. Dos o tres de mas y el usuario deja de leerlas, que es el unico
  -- modo en que este proyecto falla de verdad.
  max_alertas_hora    smallint not null default 6 check (max_alertas_hora between 1 and 100),
  creado_at           timestamptz not null default now()
);

comment on table public.perfiles is
  'Preferencias del usuario en la web. No dice nada de si es socio de nada: es solo la cuenta.';

-- Un perfil por cada usuario que se registra. Trigger en `private` porque PostgREST expone
-- como endpoint REST todo lo que esta en `public`.
create or replace function private.crear_perfil_al_registrarse()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  insert into public.perfiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

create trigger crear_perfil
  after insert on auth.users
  for each row execute function private.crear_perfil_al_registrarse();

-- ---------------------------------------------------------------------------
-- direcciones: el dato que el dueño pidio que no sea fijo
-- ---------------------------------------------------------------------------
create table public.direcciones (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null references auth.users(id) on delete cascade,
  etiqueta    text not null,          -- 'Casa', 'Trabajo', 'Casa de mis viejos'
  texto       text not null,
  lat         double precision not null check (lat between -90 and 90),
  lng         double precision not null check (lng between -180 and 180),
  activa      boolean not null default true,
  -- Cuando se resolvio contra los proveedores. La tienda de Rappi puede cambiar si reasignan
  -- la zona, asi que esto se re-resuelve periodicamente (spec 003).
  resuelta_at timestamptz,
  creada_at   timestamptz not null default now(),
  unique (usuario_id, etiqueta)
);
create index direcciones_usuario on public.direcciones (usuario_id) where activa;

comment on table public.direcciones is
  'DATOS PERSONALES: donde vive la gente. Nunca en el repo, en logs ni en artifacts. Regla de oro 14.';

-- ---------------------------------------------------------------------------
-- direcciones_tiendas: el resultado de resolver una direccion contra cada proveedor
-- ---------------------------------------------------------------------------
-- La tabla `tiendas` llega en la spec 001 (migracion 0002), asi que la FK se agrega ahi.
-- Mientras tanto `tienda_id` es un uuid sin referencia: la alternativa seria mover esta tabla
-- a la 0002, pero entonces `suscripciones` tampoco podria existir y auth no cerraria end-to-end.
create table public.direcciones_tiendas (
  direccion_id uuid not null references public.direcciones(id) on delete cascade,
  tienda_id    uuid not null,
  distancia_m  integer,
  resuelta_at  timestamptz not null default now(),
  primary key (direccion_id, tienda_id)
);

-- ---------------------------------------------------------------------------
-- suscripciones: la ENTRADA del crawler. Es lo que desacopla scrapeo de usuarios.
-- ---------------------------------------------------------------------------
-- El crawler itera las tiendas que tienen al menos una suscripcion activa, y no sabe que
-- existen usuarios. Si tres personas del mismo barrio caen en la misma tienda, se recorre una
-- sola vez: sumar gente no cuesta minutos de Actions.
create table public.suscripciones (
  id                   uuid primary key default gen_random_uuid(),
  usuario_id           uuid not null references auth.users(id) on delete cascade,
  tienda_id            uuid not null,
  direccion_id         uuid references public.direcciones(id) on delete set null,
  activa               boolean not null default true,
  -- Que reglas quiere ver este usuario. El default sale del registry de packages/core; si se
  -- desincroniza del enum, `npm run reglas:verificar` falla en CI (ADR 0007).
  reglas_habilitadas   regla_clave[] not null default
    '{precio_absurdo,caida_vs_historial,descuento_extremo,gran_descuento,vs_otras_tiendas,nuevo_vs_pasillo}',
  -- Solo avisar si el precio esta a este factor o menos de su referencia. Menor = mas exigente.
  ratio_maximo         numeric(4,3) not null default 0.5 check (ratio_maximo > 0 and ratio_maximo <= 1),
  categorias_excluidas text[] not null default '{}',
  creada_at            timestamptz not null default now(),
  unique (usuario_id, tienda_id)
);
create index suscripciones_tienda on public.suscripciones (tienda_id) where activa;

comment on table public.suscripciones is
  'La entrada del crawler: las tiendas con al menos una suscripcion activa. Ver docs/01-arquitectura.md.';

-- ---------------------------------------------------------------------------
-- canales_notificacion: Telegram y email
-- ---------------------------------------------------------------------------
create table public.canales_notificacion (
  id                uuid primary key default gen_random_uuid(),
  usuario_id        uuid not null references auth.users(id) on delete cascade,
  tipo              tipo_canal not null,
  destino           text,              -- chat_id de Telegram, o el email
  verificado        boolean not null default false,
  -- Token de un solo uso para el deep link https://t.me/<bot>?start=<token>.
  -- El TTL importa: un token sin vencimiento, filtrado en un historial de chat, le manda las
  -- alertas de una persona a otra.
  token_vinculacion text unique,
  token_expira_at   timestamptz,
  creado_at         timestamptz not null default now(),
  unique (usuario_id, tipo, destino)
);
create index canales_pendientes on public.canales_notificacion (token_vinculacion)
  where token_vinculacion is not null and not verificado;

comment on column public.canales_notificacion.destino is
  'DATOS PERSONALES: chat_id de Telegram o email. Nunca en logs. Regla de oro 14.';

-- ---------------------------------------------------------------------------
-- RLS y grants: van en la MISMA migracion que las tablas. Supabase no los da solos.
-- Las policies estan en 0008, junto con el resto del modelo de seguridad.
-- ---------------------------------------------------------------------------
alter table public.perfiles             enable row level security;
alter table public.direcciones          enable row level security;
alter table public.direcciones_tiendas  enable row level security;
alter table public.suscripciones        enable row level security;
alter table public.canales_notificacion enable row level security;
