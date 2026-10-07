-- 0001 — Schema private y los enums del dominio.
--
-- Ver docs/02-modelo-datos.md. Dos decisiones que se repiten en todas las migraciones:
--   * las funciones internas van a `private`, porque PostgREST expone como endpoint REST todo
--     lo que esta en `public`;
--   * toda tabla nueva lleva RLS y grants explicitos en la MISMA migracion.

create schema if not exists private;
revoke all on schema private from anon, authenticated;
grant usage on schema private to service_role;

-- Proveedores soportados. 'pedidosya' existe como valor pero NO se implementa: PerimeterX
-- bloquea IPs de datacenter. Ver docs/adr/0011-pedidosya-fuera-de-alcance.md.
create type public.tipo_proveedor as enum (
  'rappi',
  'vtex',
  'coto',
  'laanonima',
  'sepa',
  'pedidosya'
);

-- Separa "que promo es" de "esta promo le aplica al usuario". El repo original tenia un
-- booleano `global_offer` que cargaba los dos significados a la vez; cual se excluye es una
-- politica por proveedor (politicas.promoKindsExcluidos), no un supuesto en el codigo.
-- Ver docs/adr/0005-promo-kind-en-vez-de-global-offer.md.
create type public.promo_kind as enum (
  'ninguna',
  'descuento_lista',       -- el precio tachado del retailer
  'promo_usuario_nuevo',   -- Rappi: has_global_offers + global_offer_max_quantity = 1
  'segunda_unidad',
  'descuento_bancario',
  'combo',
  'precio_cuidado',
  'desconocida'            -- transitorio: un proveedor nuevo con una promo que no mapeamos aun
);

-- El resultado de clasificar el precio actual contra el historial PROPIO, no contra el
-- tachado del retailer. Ver docs/03-motor-deteccion.md seccion 2.
create type public.estado_oferta as enum (
  'real',          -- bajo hace poco respecto de su precio habitual previo
  'inflado',       -- cuesta lo mismo hace >= oferta_permanente_dias: ese ES su precio normal
  'sin_historial'  -- lo vemos hace muy poco para opinar
);

-- Las claves de regla dejan de ser strings libres repetidos en cinco archivos.
-- Este enum se mantiene sincronizado con packages/core/src/reglas/registry.ts, y
-- `npm run reglas:verificar` falla en CI si hay deriva.
-- Ver docs/adr/0007-registry-de-reglas-unico.md.
create type public.regla_clave as enum (
  'precio_absurdo',
  'caida_vs_historial',
  'descuento_extremo',
  'gran_descuento',
  'vs_otras_tiendas',
  'nuevo_vs_pasillo',
  'promo_usuario_nuevo'
);

-- De donde sale la identidad canonica de un producto. SOLO 'ean' y 'rappi_master' habilitan
-- la comparacion cross-tienda: un match por nombre juntaria "Yogur Ser 190g" con
-- "Yogur Ser 190g x4" y produciria un falso positivo convincente, que es la peor clase.
-- Regla de oro 15. Ver docs/adr/0006-identidad-canonica-de-producto.md.
create type public.origen_clave as enum (
  'ean',
  'rappi_master',
  'nombre_marca_presentacion'
);

-- 'descartada' no es un error: es una corrida que trajo menos del 50% del catalogo conocido
-- (o menos de 100 productos) y por eso no genera alertas ni "desapariciones". Regla de oro 6.
create type public.estado_corrida as enum (
  'en_curso',
  'ok',
  'descartada',
  'error'
);

create type public.tipo_canal as enum (
  'telegram',
  'email',
  'web'
);
