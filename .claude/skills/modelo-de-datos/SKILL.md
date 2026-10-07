---
name: modelo-de-datos
description: Tocar el esquema de la base de BuscaPromos — escribir una migracion de Supabase, agregar una tabla o columna, cambiar un enum, o escribir policies de RLS y grants. Usar antes de crear cualquier archivo en supabase/migrations.
---

# Modelo de datos y migraciones

Leé [`docs/02-modelo-datos.md`](../../../docs/02-modelo-datos.md) y
[`docs/10-seguridad-rls.md`](../../../docs/10-seguridad-rls.md).

## Las tres reglas que no se negocian

1. **Toda tabla nueva en `public` lleva RLS *y* `grant` explicitos en la misma migracion.**
   Supabase no los da solos. Una tabla sin policy con grant a `authenticated` es una tabla
   publica.
2. **Las funciones internas van al schema `private`.** PostgREST expone como endpoint REST todo
   lo que esta en `public`. Y toda funcion `security definer` lleva `set search_path` explicito:
   sin eso es un vector de ataque.
3. **`precios_cambios` es append-only.** Nunca `update`, nunca `delete` fuera de la retencion de
   90 dias. Es la regla de oro 2.

## Al escribir una policy

```sql
-- Mal: solo `using`. Un usuario puede INSERTAR una fila con el usuario_id de otro.
create policy x on public.t for all to authenticated using (usuario_id = auth.uid());

-- Bien
create policy x on public.t for all to authenticated
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
```

Y al usar el helper, envolvelo en `(select ...)` para que Postgres lo cachee como InitPlan en
vez de evaluarlo por fila:

```sql
create policy leer_hallazgos on public.hallazgos
  for select to authenticated using ((select private.usuario_ve_tienda(tienda_id)));
```

## No todo lleva policy de lectura

`corridas` y `alerta_estado` **no tienen** policy para `authenticated`, a proposito: son
internos del motor. Si PostgREST no los expone, no hay que pensar en ellos. Antes de agregar
una policy "por si acaso", preguntate si la web realmente necesita leer esa tabla.

## Al agregar una columna al catalogo o a precios

Pensá si rompe el changelog. Si la columna es parte del **estado observado** de un precio
(como `promo_kind`), tiene que entrar en la lista de campos que `aplicar_lote_precios` compara
para decidir si hubo cambio. Si no entra, los cambios de ese campo no se registran nunca.

## Al agregar un valor a `regla_clave`

Va junto con el registry de `packages/core`. `npm run reglas:verificar` compara el enum contra
`Object.keys(REGISTRY)` y falla en CI si no coinciden.

## Logica de negocio: no

La DB hace **integridad** (constraints, FKs, unicidad, RLS). El dominio vive en
`packages/core`. La excepcion deliberada es `aplicar_lote_precios`, y esta justificada en el
ADR 0004: ahi la logica va a la DB porque es el unico lugar donde la invariante del changelog
no se puede olvidar, y porque 6000 round-trips a São Paulo es inviable.

No agregues una segunda excepcion sin un ADR.

## Verificar

```bash
npm run db:reset    # recrea la DB local y aplica todo desde cero
npm run db:lint     # supabase db lint --level warning, sin warnings
npm run db:tipos    # regenera packages/db/src/tipos.ts
npm run test:rls    # los tests de RLS
```

**Los tests de RLS van con dos JWT reales de dos usuarios distintos, nunca con
`service_role`** — que saltea RLS por diseño y haria pasar un test que no prueba nada.

`npm run db:reset` desde cero en cada cambio: una migracion que solo funciona aplicada sobre tu
base actual no funciona.

## Checklist

- [ ] RLS habilitado en la tabla nueva
- [ ] Policies con `using` **y** `with check` donde hay escritura
- [ ] Grants explicitos para `anon`, `authenticated`, `service_role`
- [ ] Funciones en `private`, con `set search_path`
- [ ] `npm run db:reset` limpio desde cero
- [ ] `npm run db:lint` sin warnings
- [ ] `npm run db:tipos` corrido y commiteado
- [ ] Test de RLS con dos JWT reales
- [ ] `docs/02-modelo-datos.md` actualizado
