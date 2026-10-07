# BuscaPromos

Detector de promociones reales en Rappi y supermercados argentinos.

Un yogur vale $5.500. Un dia aparece a $3.000. ¿Es una oferta de verdad, o el precio tachado
esta inflado para que su precio de siempre parezca un descuento? Mirando la pagina es
indistinguible. Mirando el **historial propio** del producto, es obvio.

BuscaPromos recorre catalogos, guarda cada cambio de precio, y avisa por Telegram cuando algo
esta muy por debajo de su precio habitual — calculado como la moda ponderada por duracion, no
como el tachado del retailer.

## Estado

**Spec 000 (andamiaje) en curso.** Todavia no hay nada que corra.
Ver [`.llm-wiki/wiki/estado-actual.md`](.llm-wiki/wiki/estado-actual.md).

## Por donde empezar

| Si querés… | Leé |
|---|---|
| **ubicarte rapido** | [`.llm-wiki/index.md`](.llm-wiki/index.md) |
| entender el proyecto | [`docs/00-vision.md`](docs/00-vision.md) |
| entender **como detecta** | [`docs/03-motor-deteccion.md`](docs/03-motor-deteccion.md) |
| ver como se arma tecnicamente | [`docs/01-arquitectura.md`](docs/01-arquitectura.md) |
| entender la base de datos | [`docs/02-modelo-datos.md`](docs/02-modelo-datos.md) |
| agregar un proveedor | [`docs/04-contrato-proveedores.md`](docs/04-contrato-proveedores.md) |
| las decisiones y su porque | [`docs/adr/`](docs/adr/) |
| que sigue | [`docs/08-roadmap.md`](docs/08-roadmap.md) |
| trabajar en el repo | [`CLAUDE.md`](CLAUDE.md) y [`specs/README.md`](specs/README.md) |

## Estructura

```
CLAUDE.md          instrucciones permanentes: las 16 reglas de oro del dominio
.llm-wiki/         estado real del proyecto: que hay, que falta, que esta bloqueado
docs/              documentacion, y docs/adr/ con las decisiones
specs/             una carpeta por cambio: propuesta -> escenarios -> diseño -> tareas ->
                   verificacion -> revision adversarial
.claude/skills/    skills de dominio y de proceso
fixtures/          capturas reales redactadas (red/) y casos sinteticos (casos/)
packages/core      deteccion, registry de reglas, normalizacion
packages/providers  contrato de Proveedor + uno por proveedor
packages/db        todo el acceso a datos
apps/web           Next 15 en Vercel
apps/crawler       corrida, probe, notificar
supabase/          migraciones y seed
```

## Setup

```bash
npm install
cp .env.example .env.local     # completar
npm run db:arrancar            # Postgres local en Docker
npm run db:reset               # migraciones + seed
npm run verificar              # typecheck + lint + test + reglas + fixtures
npm run dev                    # la web en local
```

El comando de todos los dias es **`npm run corrida:offline`**: corrida completa con deteccion,
contra fixtures, sin red y sin escribir en produccion.

## Atribucion

El motor de deteccion es un port a TypeScript del de
[`ivokalaizic/rappi-turbo-radar`](https://github.com/ivokalaizic/rappi-turbo-radar), de Ivo
Kalaizic, que resolvio la parte dificil: distinguir una oferta real de un tachado inflado, y no
mandar la misma alerta cada 15 minutos.

## Aviso

Los terminos de servicio de los sitios que se consultan prohiben el scraping, aunque los
endpoints sean publicos. Esto es de **uso personal**, volumen bajo, con delays y sin reventa de
datos. Ver [`docs/11-legal-y-tos.md`](docs/11-legal-y-tos.md).
