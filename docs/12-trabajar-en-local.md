# 12 — Trabajar en local

El repo es publico, asi que clonarlo no necesita permisos. Esta guia sirve tanto para
desarrollar a mano como para correr una sesion de Claude Code sobre el repo local.

## Clonar

```powershell
cd C:\repos
git clone https://github.com/TomasMallo22/BuscaPromos.git
cd BuscaPromos
git checkout claude/festive-heisenberg-xvs0r9
npm install
```

El trabajo vive en la branch `claude/festive-heisenberg-xvs0r9`, todavia no en `main`.

## Que corre hoy

```powershell
npm run verificar     # typecheck + lint + tests + los dos chequeos estructurales
```

Lo demas (`npm run dev`, `npm run corrida:offline`) **todavia no**, porque `apps/web` y
`apps/crawler` no estan implementados. Ver `specs/001-rappi-end-to-end/03-tareas.md`.

Para correr el oraculo que valida el motor contra la implementacion original en Python:

```powershell
cd C:\repos
git clone --depth 1 https://github.com/ivokalaizic/rappi-turbo-radar
cd BuscaPromos
python scripts\validar-casos-contra-original.py C:\repos\rappi-turbo-radar
```

## Variables de entorno

`cp .env.example .env.local` y completar. `.env.local` **nunca** se commitea.

| Variable | De donde sale |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://yqfupeqgjibtfvgazvqw.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | panel de Supabase → Project Settings → API Keys → la publica |
| `SUPABASE_SERVICE_ROLE_KEY` | mismo lugar, la **secreta**. Solo para el crawler y las migraciones |
| `TELEGRAM_BOT_TOKEN` | @BotFather, cuando se arme el bot |
| `RAPPI_APP_VERSION` | `web_v1.223.2` (ver `docs/07-operacion.md` si rompe) |
| `RAPPI_DEVICE_ID` | un uuid4 **estable**: `python -c "import uuid; print(uuid.uuid4())"`. Generar uno nuevo en cada corrida es el patron que dispara anti-fraude |

**La `service_role` saltea RLS por diseño**: si llega al bundle del front, expone la base
entera. En Vercel no se define como `NEXT_PUBLIC_*`. Ver `docs/10-seguridad-rls.md`.

## Correr una sesion de Claude Code sobre el repo local

```powershell
cd C:\repos\BuscaPromos
claude
```

Arranca leyendo `CLAUDE.md`, que la manda a `.llm-wiki/index.md`: ahi esta que hay hecho, que
falta y que esta bloqueado. Para seguir con la spec en curso alcanza con pedirle:

> Seguí la spec 001 desde la tarea 1 de `specs/001-rappi-end-to-end/03-tareas.md`.

Las skills de `.claude/skills/` se cargan solas segun la tarea: `motor-deteccion` para el
algoritmo, `modelo-de-datos` para las migraciones, `proveedor-nuevo` para el cliente de Rappi.

### Lo que una sesion local puede hacer y la nube no

- Levantar Postgres local con `npx supabase start` (necesita Docker) y correr `db:reset` sin
  tocar produccion.
- `npm run dev` con hot reload, cuando `apps/web` exista.
- Iterar rapido, sin que un contenedor se reinicie en el medio.

### Lo que necesita credenciales

Aplicar migraciones a produccion o correr el crawler contra la base real necesita la
`SUPABASE_SERVICE_ROLE_KEY` en `.env.local`.

## El estado del proyecto, siempre

No lo busques en el historial de un chat. Esta en
[`../.llm-wiki/wiki/estado-actual.md`](../.llm-wiki/wiki/estado-actual.md), y se actualiza con
el comando `/wiki`.
