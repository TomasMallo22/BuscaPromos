-- 0011 — aplicar_lote_precios: changelog + snapshot + el set de cambiados, en un viaje.
--
-- La excepcion deliberada a "la DB no tiene logica de negocio" (ADR 0004): 6000 upserts
-- individuales contra São Paulo son inviables, y aca la invariante "changelog, no snapshot"
-- queda forzada en un solo lugar en vez de depender de que el crawler se acuerde.
--
-- Devuelve los productos nuevos o cambiados: es la capa 1 del anti-spam (solo se evalua lo que
-- se movio). Ver docs/03-motor-deteccion.md seccion 5.
--
-- Vive en `public` y no en `private` porque el crawler la llama por RPC y PostgREST solo
-- publica `public`. Lo que la protege es el revoke de abajo: solo service_role la ejecuta.

create or replace function public.aplicar_lote_precios(
  p_tienda_id uuid,
  p_ts        timestamptz,
  p_filas     jsonb   -- [{producto_id, precio, precio_lista, promo_kind, en_stock, stock}]
)
returns table (producto_id uuid, motivo text)
language sql
security invoker
set search_path = public
as $$
  with entrada as (
    -- Un producto puede aparecer en dos sub-pasillos de la misma corrida. Sin el distinct, el
    -- upsert de abajo falla con "cannot affect row a second time".
    select distinct on ((f->>'producto_id')::uuid)
      (f->>'producto_id')::uuid                         as producto_id,
      (f->>'precio')::numeric(12,2)                     as precio,
      nullif(f->>'precio_lista', '')::numeric(12,2)     as precio_lista,
      coalesce(f->>'promo_kind', 'ninguna')::promo_kind as promo_kind,
      (f->>'en_stock')::boolean                         as en_stock,
      nullif(f->>'stock', '')::integer                  as stock
    from jsonb_array_elements(p_filas) f
    order by (f->>'producto_id')::uuid
  ),
  comparado as (
    select
      e.*,
      pa.producto_id is null as es_nuevo,
      -- Los cuatro campos del ESTADO OBSERVADO. Si agregas uno a precios_cambios, va aca:
      -- si no, sus cambios no se registran nunca (skill modelo-de-datos).
      pa.producto_id is not null
        and (pa.precio, pa.precio_lista, pa.promo_kind, pa.en_stock)
            is distinct from (e.precio, e.precio_lista, e.promo_kind, e.en_stock) as cambio
    from entrada e
    left join public.precios_actuales pa
      on pa.tienda_id = p_tienda_id and pa.producto_id = e.producto_id
  ),
  changelog as (
    insert into public.precios_cambios (tienda_id, producto_id, ts, precio, precio_lista, promo_kind, en_stock)
    select p_tienda_id, c.producto_id, p_ts, c.precio, c.precio_lista, c.promo_kind, c.en_stock
    from comparado c
    where c.es_nuevo or c.cambio
  ),
  snapshot as (
    insert into public.precios_actuales
      (tienda_id, producto_id, precio, precio_lista, promo_kind, en_stock, stock, visto_at, cambio_at)
    select p_tienda_id, c.producto_id, c.precio, c.precio_lista, c.promo_kind, c.en_stock, c.stock, p_ts, p_ts
    from comparado c
    on conflict (tienda_id, producto_id) do update set
      precio       = excluded.precio,
      precio_lista = excluded.precio_lista,
      promo_kind   = excluded.promo_kind,
      en_stock     = excluded.en_stock,
      stock        = excluded.stock,
      visto_at     = excluded.visto_at,
      cambio_at    = case
        when (precios_actuales.precio, precios_actuales.precio_lista, precios_actuales.promo_kind, precios_actuales.en_stock)
             is distinct from (excluded.precio, excluded.precio_lista, excluded.promo_kind, excluded.en_stock)
        then excluded.cambio_at
        else precios_actuales.cambio_at
      end
  )
  select c.producto_id, case when c.es_nuevo then 'nuevo' else 'cambio' end
  from comparado c
  where c.es_nuevo or c.cambio;
$$;

comment on function public.aplicar_lote_precios(uuid, timestamptz, jsonb) is
  'Changelog + snapshot + set de cambiados. Llamar en chunks de ~500. Solo service_role.';

revoke execute on function public.aplicar_lote_precios(uuid, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function public.aplicar_lote_precios(uuid, timestamptz, jsonb) to service_role;
