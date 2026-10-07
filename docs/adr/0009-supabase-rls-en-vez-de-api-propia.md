# ADR 0009 — Supabase con RLS en vez de una API propia

- **Fecha:** 2026-10-07
- **Estado:** aceptada

## Contexto

El multiusuario necesita que cada persona vea solo sus datos. El camino clasico es una API
propia que filtre por usuario en cada endpoint.

## Decision

La web consulta Postgres directo a traves de Supabase, con las reglas de acceso en **RLS**. No
hay capa de API propia.

## Consecuencias

**A favor:** no hay backend que escribir ni mantener; la regla de "quien ve que" vive en un solo
lugar, en la base, y no se puede olvidar en un endpoint nuevo; el dueño ya usa Supabase en
CirculoAjedrezBeccar.

**En contra, y es real:** RLS es facil de escribir mal, y escribirlo mal **expone la direccion
de la casa de alguien**. Se mitiga con:

- `with check` ademas de `using` en toda policy de escritura. Sin el, un usuario puede insertar
  una fila con el `usuario_id` de otro.
- Helpers en el schema `private` (PostgREST expone todo `public` como REST) con `search_path`
  explicito.
- Policies que llaman el helper envuelto en `(select ...)`, para que Postgres lo cachee como
  InitPlan y no lo evalue por fila.
- **Tests con dos JWT reales**, nunca con `service_role`, que saltea RLS y haria pasar un test
  que no prueba nada.
- `revision-adversarial` obligatoria en todo cambio que toque RLS.

Y la contracara: la clave `service_role` saltea RLS por diseño, asi que llega a ser el bug de
una linea que expone la base entera. Defensa en cuatro capas en
[`../10-seguridad-rls.md`](../10-seguridad-rls.md).
