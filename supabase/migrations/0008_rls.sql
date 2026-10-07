-- 0008 — Policies de RLS y grants.
--
-- Dos cosas que proteger: las direcciones de las personas (donde viven) y la base entera (de
-- que la clave service_role se filtre en el bundle del front). Ver docs/10-seguridad-rls.md.
--
-- `with check` ademas de `using` NO es redundante: sin el, un usuario puede INSERTAR una fila
-- con el usuario_id de otro. Es el error clasico de RLS y el que mas duele acá.

-- ---------------------------------------------------------------------------
-- El helper, en `private` para que PostgREST no lo exponga como endpoint REST
-- ---------------------------------------------------------------------------
-- `security definer` + `set search_path` explicito: una funcion security definer sin
-- search_path fijo es un vector de ataque.
create or replace function private.usuario_ve_tienda(p_tienda_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.suscripciones s
    where s.tienda_id = p_tienda_id
      and s.usuario_id = auth.uid()
      and s.activa
  );
$$;

comment on function private.usuario_ve_tienda(uuid) is
  'Usar SIEMPRE envuelta en (select ...) dentro de una policy, para que Postgres la cachee como InitPlan en vez de evaluarla por fila.';

grant execute on function private.usuario_ve_tienda(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Grupo 1 — Datos del usuario: solo el dueño, lectura y escritura
-- ---------------------------------------------------------------------------
create policy propio_perfil on public.perfiles
  for all to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy propias_direcciones on public.direcciones
  for all to authenticated
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

create policy propias_suscripciones on public.suscripciones
  for all to authenticated
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

create policy propios_canales on public.canales_notificacion
  for all to authenticated
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

-- `direcciones_tiendas` no tiene usuario_id propio: se llega por la direccion. La escritura la
-- hace el service_role al resolver, asi que para `authenticated` es solo lectura.
create policy leer_propias_direcciones_tiendas on public.direcciones_tiendas
  for select to authenticated
  using (
    exists (
      select 1 from public.direcciones d
      where d.id = direccion_id and d.usuario_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Grupo 2 — Grants explicitos
-- ---------------------------------------------------------------------------
-- `anon` no tiene NADA: sin sesion no se ve nada.
revoke all on all tables in schema public from anon, authenticated;

grant select, insert, update on public.perfiles to authenticated;
grant select, insert, update, delete on public.direcciones to authenticated;
grant select, insert, update, delete on public.suscripciones to authenticated;
grant select, insert, update, delete on public.canales_notificacion to authenticated;
grant select on public.direcciones_tiendas to authenticated;

-- El crawler y las migraciones corren como service_role, que saltea RLS por diseño.
-- Por eso esa clave JAMAS puede llegar a apps/web: ver docs/10-seguridad-rls.md.
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- Lo que se cree de acá en adelante arranca sin permisos para anon/authenticated, asi que cada
-- migracion nueva tiene que dar los suyos a mano. Es a proposito: una tabla que se expone por
-- olvido es peor que una que no se puede leer.
alter default privileges in schema public revoke all on tables from anon, authenticated;
