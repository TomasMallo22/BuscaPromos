-- 0019 — Avisos por Telegram, por categoria y por producto (spec 004).

-- ---------------------------------------------------------------------------
-- Preferencias: que le interesa a cada uno
-- ---------------------------------------------------------------------------
-- Las claves de categoria salen de packages/core/src/normalizacion/categoria.ts (CATEGORIAS);
-- la web solo deja elegir esas. Los terminos son texto libre ("aceite de oliva").
alter table public.perfiles
  add column avisos_categorias text[] not null default '{}'
    check (cardinality(avisos_categorias) <= 20),
  add column avisos_terminos text[] not null default '{}'
    check (cardinality(avisos_terminos) <= 30);

-- El usuario edita sus preferencias; nada mas de su perfil (misma idea que la 0018).
revoke update on public.perfiles from authenticated;
grant update (nombre, hora_silencio_desde, hora_silencio_hasta, max_alertas_hora, avisos_categorias, avisos_terminos)
  on public.perfiles to authenticated;

-- ---------------------------------------------------------------------------
-- Vincular Telegram sin que el usuario escriba `verificado` ni `destino`
-- ---------------------------------------------------------------------------
-- Si `authenticated` pudiera insertar en `canales_notificacion`, se pondria `verificado = true`
-- con el chat_id de otra persona y le mandaria sus avisos (E13). El token lo crea una funcion y
-- la vinculacion la hace otra.
revoke insert, update on public.canales_notificacion from authenticated;

create or replace function public.crear_vinculo_telegram()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  yo uuid := auth.uid();
  token text := replace(gen_random_uuid()::text, '-', '') ; -- 122 bits al azar
begin
  if yo is null then
    raise exception 'sin sesion';
  end if;
  delete from public.canales_notificacion where usuario_id = yo and tipo = 'telegram' and not verificado;
  insert into public.canales_notificacion (usuario_id, tipo, token_vinculacion, token_expira_at)
  values (yo, 'telegram', token, now() + interval '15 minutes');
  return token;
end;
$$;

revoke all on function public.crear_vinculo_telegram() from public, anon;
grant execute on function public.crear_vinculo_telegram() to authenticated;

-- La llama el webhook de Telegram con la clave publica (sin sesion de usuario). Lo que la
-- protege es el token: 122 bits, un solo uso, 15 minutos. Devuelve solo si vinculo.
create or replace function public.vincular_telegram(p_token text, p_chat_id text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  fila public.canales_notificacion;
begin
  if p_token is null or length(p_token) <> 32 or p_chat_id is null or p_chat_id !~ '^-?[0-9]{1,20}$' then
    return false;
  end if;
  select * into fila from public.canales_notificacion
   where tipo = 'telegram' and token_vinculacion = p_token and not verificado and token_expira_at > now()
   for update;
  if not found then
    return false;
  end if;
  -- Un Telegram por usuario: el nuevo reemplaza al anterior.
  delete from public.canales_notificacion
   where usuario_id = fila.usuario_id and tipo = 'telegram' and id <> fila.id;
  update public.canales_notificacion
     set destino = p_chat_id, verificado = true, token_vinculacion = null, token_expira_at = null
   where id = fila.id;
  return true;
end;
$$;

revoke all on function public.vincular_telegram(text, text) from public;
grant execute on function public.vincular_telegram(text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Descuentos anunciados avisados (los hallazgos van a `notificaciones`)
-- ---------------------------------------------------------------------------
-- Una fila por (usuario, tienda, producto): el precio avisado es el estado de la capa 2 del
-- anti-spam. Si el precio baja mas de 5%, se vuelve a avisar y se actualiza la fila.
create table public.avisos_descuento (
  usuario_id     uuid not null references auth.users(id) on delete cascade,
  tienda_id      uuid not null references public.tiendas(id) on delete cascade,
  producto_id    uuid not null references public.productos(id) on delete cascade,
  precio_avisado numeric(12,2) not null,
  precio_lista   numeric(12,2) not null,
  termino        text not null,
  creado_at      timestamptz not null default now(),
  enviada_at     timestamptz,
  error          text,
  primary key (usuario_id, tienda_id, producto_id)
);
create index avisos_descuento_pendientes on public.avisos_descuento (usuario_id) where enviada_at is null;

alter table public.avisos_descuento enable row level security;
create policy leer_propios_avisos_descuento on public.avisos_descuento
  for select to authenticated using (usuario_id = (select auth.uid()));
grant select on public.avisos_descuento to authenticated;
grant all on public.avisos_descuento to service_role;

-- `notificaciones` guarda tambien el error de envio y se reintenta: el indice de pendientes.
create index notificaciones_pendientes on public.notificaciones (usuario_id) where enviada_at is null;
