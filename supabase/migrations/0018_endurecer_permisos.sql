-- 0018 — Endurecer lo que `authenticated` puede escribir (revision de seguridad, 2026-10-13).
--
-- Las policies de la 0008 dicen DE QUIEN es la fila (`usuario_id = auth.uid()`), pero no QUE
-- columnas puede tocar el usuario. Con la clave publica y su JWT, cualquiera puede hablarle a
-- PostgREST sin pasar por la web, asi que lo que la web "no hace" no alcanza.

-- 1. suscripciones: las crea SOLO el crawler (service_role) al resolver una direccion. Si el
--    usuario pudiera insertar o cambiar `tienda_id`, se suscribiria a cualquier tienda: veria sus
--    precios y hallazgos (RLS por `usuario_ve_tienda`) y haria que el crawler la recorra.
--    Puede apagar la suya y ajustar sus preferencias; no apuntarla a otra tienda.
revoke insert, update on public.suscripciones from authenticated;
grant update (activa, reglas_habilitadas, ratio_maximo, categorias_excluidas) on public.suscripciones to authenticated;

-- 2. direcciones: el usuario edita lo suyo; el estado de resolucion lo escribe el crawler.
revoke update on public.direcciones from authenticated;
grant update (etiqueta, texto, lat, lng, activa) on public.direcciones to authenticated;

-- 3. Funciones de `private` con EXECUTE de mas. No era explotable (anon no tiene USAGE sobre
--    `private`, y una funcion de trigger no se puede llamar suelta), pero el permiso no hace falta.
revoke execute on function private.crear_perfil_al_registrarse() from public, anon, authenticated;
revoke execute on function private.usuario_ve_tienda(uuid) from public, anon;
