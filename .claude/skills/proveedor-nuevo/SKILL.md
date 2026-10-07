---
name: proveedor-nuevo
description: Agregar o modificar un proveedor de precios en BuscaPromos (Rappi, VTEX, Coto, La Anonima, SEPA) — cumplir el contrato de Proveedor, declarar sus politicas, escribir sus zod schemas y capturar sus fixtures. Usar antes de tocar packages/providers.
---

# Agregar un proveedor

Leé [`docs/04-contrato-proveedores.md`](../../../docs/04-contrato-proveedores.md) y
[`.llm-wiki/wiki/fuentes.md`](../../../.llm-wiki/wiki/fuentes.md), que tiene lo que ya se sabe
de cada fuente y la fecha en que se verifico.

## La regla que define si lo hiciste bien

**Agregar un proveedor no debe obligar a tocar `packages/core`.** Si lo necesitás, el contrato
esta mal y se arregla en el contrato, no con un parche en el proveedor.

## Los cinco archivos

```
packages/providers/src/<id>/
├── politicas.ts    PoliticasProveedor, con un comentario por cada valor no default y POR QUE
├── schemas.ts      zod schemas de las respuestas
├── index.ts        la implementacion del contrato
└── index.test.ts   parsing contra fixtures/<id>/red/
fixtures/<id>/       manifest.json + red/
```

Mas una fila en `proveedores` via `supabase/seed.sql`, con `politicas` como espejo del TS.

**Sin fixtures no hay proveedor.** Un cliente que nunca se ejercito contra una respuesta real
es una hipotesis, no codigo.

## Las politicas no son opcionales

Cada una existe porque un proveedor se comporta distinto, y el default equivocado produce bugs
silenciosos:

| Politica | Si la pones mal |
|---|---|
| `faltanteEsSinStock` | marcás medio catalogo como desaparecido (Rappi `true`, VTEX `false`) |
| `promoKindsExcluidos` | alertás promos que al usuario no le aplican |
| `confiarPrecioLista` | con el `ListPrice` roto de Cencosud (82x), falsos "-99%" |
| `nivelAgrupacionPasillo` | con taxonomia de 4 niveles, nunca juntás 8 comparables |
| `msEntreRequests` | 429 en cadena, o te bloquean |

## El walk recursivo se conserva

Para Rappi, la extraccion de productos es un duck-test
(`'product_id' in obj && 'price' in obj`) sobre un walk recursivo, **no** un acceso por ruta
fija. Eso es lo que lo hace robusto a que cambien el layout de los componentes.

Hay un test que toma un fixture, lo **envuelve en dos niveles mas de anidamiento**, y verifica
que sigue encontrando los mismos productos. Si agregás un proveedor con una respuesta anidada,
copiá ese patron.

## Los zod schemas sirven tres veces

Parsear la respuesta real, validar que el fixture no se podrio (`fixtures:verificar` en CI), y
tipar. Escribilos una vez y usalos en los tres lados.

**Schemas permisivos en los bordes, estrictos en el centro**: `.passthrough()` en los
contenedores (si el proveedor agrega un campo, no queremos fallar) y estricto en los campos que
usamos (si `price` deja de ser numero, queremos fallar fuerte y ya).

## La clave canonica

```ts
claveCanonica(p): { clave: string; origen: OrigenClave }
```

Orden de preferencia: `ean:` → `rm:` (solo Rappi) → `nmp:`.

**`nmp` no habilita `vs_otras_tiendas`** (regla de oro 15, ADR 0006). Si tu proveedor no expone
EAN, la regla de comparacion cross-tienda simplemente no corre para sus productos. No lo
"arregles" bajando el requisito.

## El checklist

- [ ] `politicas.ts` con un comentario por valor no default
- [ ] zod schemas, usados por el parser y por `fixtures:verificar`
- [ ] fixtures capturados con `probe`, redactados, verificados y promovidos
- [ ] test de parsing, incluido el de robustez a anidamiento
- [ ] `urlProducto` apunta a algo donde el producto **se puede comprar en esa tienda**
- [ ] `claveCanonica` con el origen correcto
- [ ] fila en `seed.sql`
- [ ] `.llm-wiki/wiki/fuentes.md` actualizado, **con fecha**
- [ ] ningun token, `deviceid` ni direccion en los logs
