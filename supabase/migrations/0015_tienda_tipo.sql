-- 0015 — El tipo de tienda de Rappi (spec 002).
--
-- Rappi no es una tienda: es Turbo y los supermercados que vende (Jumbo, Coto...), cada uno con
-- su `store_type`. El crawler lo necesita para armar el request; la web, para el link y para
-- decir "en Coto". La lista de tipos validos vive en packages/providers/src/rappi/tiendas.ts.
alter table public.tiendas add column tipo text not null default 'turbo';

-- Entra al grant por columna: la web lo lee. Las coordenadas siguen afuera (E23 de la 001).
grant select (tipo) on public.tiendas to authenticated;
