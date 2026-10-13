-- 0016 — Direcciones editables, "sin cobertura" con fallo diurno, y la categoria comun (spec 003).

-- ---------------------------------------------------------------------------
-- Una suscripcion por direccion y tienda
-- ---------------------------------------------------------------------------
-- Antes: unique (usuario_id, tienda_id) y `direccion_id ... on delete set null`. Borrar una
-- direccion dejaba la suscripcion huerfana y la tienda se seguia recorriendo (la oficina del
-- dueño, 2026-10-13). Ahora la suscripcion es de la direccion: se va con ella.
delete from public.suscripciones where direccion_id is null;

alter table public.suscripciones drop constraint suscripciones_usuario_id_tienda_id_key;
alter table public.suscripciones alter column direccion_id set not null;
alter table public.suscripciones drop constraint suscripciones_direccion_id_fkey;
alter table public.suscripciones
  add constraint suscripciones_direccion_id_fkey
  foreign key (direccion_id) references public.direcciones(id) on delete cascade;
alter table public.suscripciones
  add constraint suscripciones_direccion_tienda_key unique (direccion_id, tienda_id);

-- ---------------------------------------------------------------------------
-- Mover una direccion invalida sus tiendas
-- ---------------------------------------------------------------------------
-- Integridad de datos derivados, no logica de negocio: sin esto, una direccion movida seguiria
-- suscripta a las tiendas de su ubicacion vieja. `security definer` porque `authenticated` no
-- puede borrar `direcciones_tiendas` (la escribe el crawler).
create or replace function private.direccion_movida()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.lat, new.lng) is distinct from (old.lat, old.lng) then
    delete from public.direcciones_tiendas where direccion_id = old.id;
    delete from public.suscripciones where direccion_id = old.id;
    new.resuelta_at := null;
    new.sin_cobertura_at := null;
    new.fallo_diurno_at := null;
  end if;
  return new;
end;
$$;

revoke all on function private.direccion_movida() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- "Sin cobertura" solo con un intento fallido de dia (spec 003, E9)
-- ---------------------------------------------------------------------------
alter table public.direcciones add column fallo_diurno_at timestamptz;

create trigger direccion_movida
  before update of lat, lng on public.direcciones
  for each row execute function private.direccion_movida();

-- ---------------------------------------------------------------------------
-- La categoria comun del producto (packages/core/src/normalizacion/categoria.ts)
-- ---------------------------------------------------------------------------
-- La escribe el crawler al guardar el catalogo; la web filtra por ella (regla de oro 11).
-- Entra al grant de `select` que `authenticated` ya tiene sobre `productos`.
alter table public.productos add column categoria text not null default 'otros';
create index productos_categoria on public.productos (categoria);
