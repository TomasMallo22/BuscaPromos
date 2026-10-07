# 10 — Seguridad y RLS

Dos cosas que proteger: **las direcciones de las personas** (donde viven, regla de oro 14) y
**la base entera** (de que una clave se filtre en el bundle del front).

## El repo es publico

Por construccion no contiene ni un dato personal:

| Cosa | Donde vive |
|---|---|
| direcciones, lat/lng | `public.direcciones`, con RLS |
| `chat_id` de Telegram, emails | `public.canales_notificacion`, con RLS |
| tokens de Rappi, claves de Supabase, bot token | secrets de Actions y env vars de Vercel |
| capturas crudas del `probe` | `probes/`, en `.gitignore` |
| fixtures | `fixtures/`, **redactados y verificados** |

Por eso `docs/`, `specs/`, `.llm-wiki/` y `.claude/` **si** se versionan (al reves que en
CirculoAjedrezBeccar): no hay nada sensible en ellos, y son el estado del proyecto.

Lo que queda expuesto es el **metodo**: el repo dice en voz alta que scrapeamos. Eso es
exposicion de ToS, no de privacidad. Ver [`11-legal-y-tos.md`](11-legal-y-tos.md).

**Los logs de Actions de un repo publico son publicos.** Cualquier workflow que toque
direcciones las enmascara con `::add-mask::` antes de usarlas.

## RLS: los tres grupos

| Grupo | Tablas | Policy |
|---|---|---|
| Del usuario | `perfiles`, `direcciones`, `suscripciones`, `canales_notificacion`, `notificaciones` | solo el dueño, `using` **y** `with check` por `auth.uid()` |
| De scrapeo | `hallazgos`, `precios_actuales`, `precios_cambios`, `tiendas` | lectura solo de tiendas suscriptas; escritura solo `service_role` |
| Catalogo | `productos`, `productos_canonicos` | lectura libre: nombres y marcas sin precios, no es sensible |
| Internos | `corridas`, `alerta_estado` | **sin policy** para `authenticated`: nadie los lee por REST |

`with check` ademas de `using` no es redundante: sin el, un usuario podria **insertar** una fila
con el `usuario_id` de otro.

## El helper

```sql
create or replace function private.usuario_ve_tienda(p_tienda_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.suscripciones s
                 where s.tienda_id = p_tienda_id and s.usuario_id = auth.uid() and s.activa);
$$;
```

Tres detalles: va en `private` (si estuviera en `public`, PostgREST la expondria como endpoint);
`set search_path` explicito (una funcion `security definer` sin eso es un vector de ataque); y
en las policies se usa envuelta en `(select private.usuario_ve_tienda(tienda_id))`, para que
Postgres la cachee como InitPlan en vez de evaluarla por fila.

## Grants explicitos

Supabase ya no da grants automaticos. Toda migracion que crea una tabla termina con ellos:

```sql
revoke all on all tables in schema public from anon, authenticated;
grant select on public.productos, public.tiendas, public.hallazgos to authenticated;
grant select, insert, update, delete on public.direcciones, public.suscripciones to authenticated;
grant all on all tables in schema public to service_role;
```

`anon` no tiene nada. Sin sesion no se ve nada.

## `service_role`: el bug de una linea

La clave `service_role` **saltea RLS por diseño**. Si llega al bundle del front, cualquiera lee
y escribe toda la base.

Defensa en cuatro capas, porque el costo de equivocarse es total:

1. Vive solo en `packages/db/src/servicio.ts`, nunca en `packages/db/src/index.ts`.
2. Lint rule `no-service-role-en-web`: `apps/web` no puede importar ese archivo.
3. `grep` en CI por `SUPABASE_SERVICE_ROLE_KEY` fuera de `apps/crawler` y `packages/db`.
4. **Throw en runtime** si `typeof window !== 'undefined'`, por si las tres anteriores fallan.

En Vercel, `SUPABASE_SERVICE_ROLE_KEY` **no** se define como `NEXT_PUBLIC_*`. Nunca.

## Como se verifica RLS

**Con dos JWT reales de dos usuarios distintos.** No con `service_role`, que por definicion
saltea RLS y haria pasar un test que no prueba nada.

El test crea dos usuarios, le da a cada uno una direccion y una suscripcion a tiendas distintas,
y verifica que:

- A no lee `hallazgos`, `tiendas`, `precios_*` ni `direcciones` de B.
- A no puede insertar una fila con `usuario_id = B`.
- `authenticated` no puede escribir en `precios_cambios`, `hallazgos` ni `alerta_estado`.
- `anon` no lee nada.

Y `supabase db lint --level warning` sin warnings.

**La `revision-adversarial` es obligatoria** en cualquier cambio que toque auth, RLS o datos
personales, y mejor en otra sesion que la que implemento. Un bug de RLS expone la direccion de
la casa de alguien.

## Telegram

El webhook valida el header `X-Telegram-Bot-Api-Secret-Token` contra
`TELEGRAM_WEBHOOK_SECRET`. Sin eso, cualquiera que descubra la URL puede inyectar mensajes.

El `token_vinculacion` es de un solo uso y expira en 15 minutos. Sin TTL, un token filtrado en
un historial de chat permite que otra persona reciba tus alertas.
