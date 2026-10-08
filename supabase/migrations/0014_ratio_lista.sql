-- 0014 — El descuento que ANUNCIA el proveedor, como columna.
--
-- El dueño eligio (2026-10-08) que el feed muestre, mientras se junta historial, los mayores
-- descuentos que anuncia Rappi, marcados "segun Rappi, sin verificar". No es una deteccion
-- (regla de oro 1: el tachado no es referencia); es mostrar lo que el proveedor dice, con
-- la aclaracion. Para ordenarlos sin que la web calcule nada (regla de oro 11), es columna.
alter table public.precios_actuales
  add column ratio_lista numeric generated always as (
    case when precio_lista > 0 and precio_lista > precio then precio / precio_lista end
  ) stored;

create index precios_actuales_descuentos on public.precios_actuales (tienda_id, ratio_lista)
  where ratio_lista is not null and en_stock;
