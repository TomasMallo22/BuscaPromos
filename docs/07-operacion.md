# 07 — Operacion

## Los cuatro workflows

| Workflow | Disparo | Que hace |
|---|---|---|
| `ci.yml` | PR y push a `main` | typecheck, lint, test, build, `reglas:verificar`, `fixtures:verificar` |
| `probe.yml` | a mano | pega a la API real, redacta, sube el JSON como artifact |
| `corrida.yml` | cron + a mano | la corrida de produccion: scrapea, detecta, notifica |
| `corrida-seca.yml` | a mano | crawl real + deteccion real, **sin escribir en la DB** |

`corrida-seca.yml` es la que se corre **antes de mergear cualquier cambio al cliente de un
proveedor**. Imprime los hallazgos en el `GITHUB_STEP_SUMMARY`.

## Los secrets de `corrida.yml`

| Donde | Nombre | Que |
|---|---|---|
| GitHub → Settings → Secrets → Actions | `SUPABASE_URL` | `https://yqfupeqgjibtfvgazvqw.supabase.co` |
| idem | `SUPABASE_SERVICE_ROLE_KEY` | la clave **secreta** de Supabase (`sb_secret_...`) |
| idem | `RAPPI_DEVICE_ID` | un uuid4 **estable**, generado una vez |
| GitHub → Settings → Variables → Actions | `RAPPI_APP_VERSION` | opcional; si falta, `web_v1.223.2` |
| Vercel → Environment Variables | `GITHUB_TOKEN_CORRIDA` | token fine-grained: solo este repo, permiso *Actions: read and write* |

**El cron solo corre en la branch por defecto**, que tiene que ser `main`.

## Cada tienda a su ritmo (spec 002)

El cron corre cada 30 minutos, pero cada corrida recorre solo las tiendas a las que les toca:
Turbo cada 30 minutos, los supermercados cada 4 horas (`TIENDAS_RAPPI`). Las direcciones se
re-consultan cada hora, asi una tienda que no estaba (Turbo de noche) se suma sola.

## Rappi de noche

El router de tiendas no lista la Turbo cuando esta cerrada (verificado el 2026-10-08 a las
22:37 ART: solo aparece "Rappi Express", `turbo_express_nc`, que es otra tienda). El catalogo
de una tienda ya conocida se lee igual. Consecuencias:

- Una direccion cargada de noche queda "buscando tu tienda" hasta que Turbo abre. El crawler
  la reintenta en cada corrida y recien la marca sin cobertura despues de 24 horas.
- Las corridas nocturnas de tiendas ya resueltas funcionan normalmente.

## Cadencia y presupuesto de minutos

Con repo **publico**, Actions es gratis e ilimitado y la cadencia es libre (cada 15-30 min).

Mientras el repo siga **privado**: 2.000 min/mes, facturados **redondeando hacia arriba por
minuto y por job**.

| Cadencia | Runs/mes | min/mes (3 min/run) | ¿Entra? |
|---|---|---|---|
| cada 15 min, 24h | 2.880 | 8.640 | no |
| cada 30 min, 24h | 1.440 | 4.320 | no |
| **cada hora, 07-23h** | **480** | **1.440** | **si**, ~500 de margen para CI |

El cron en minutos "raros" (7, 22, 37, 52) esquiva los picos de :00/:15/:30/:45, donde GitHub
atrasa o saltea los schedules. GitHub ademas **desactiva los cron de repos sin actividad a los
60 dias**: el workflow se re-habilita solo con un `gh api -X PUT .../enable` al final.

## Runbook: "rompio Rappi"

Sintoma tipico: corridas `descartada` o `error` seguidas, o `productos_vistos` en cero.

1. **`app_version`.** Es el primer sospechoso, siempre. Abrir rappi.com.ar con DevTools →
   Network → cualquier request a `services.rappi.com.ar` → header `app-version`. Comparar con
   `RAPPI_APP_VERSION`. Si cambio, actualizar el secret y disparar `corrida.yml` a mano.
2. **Correr `probe.yml`** con `pasos=passport,guest,stores,aisles`. Dice en que paso de los 4
   se rompe.
3. **Bajar el artifact y comparar con el fixture.** `npm run fixtures:promover` imprime el diff:
   eso dice exactamente que campo se movio.
4. **Anotarlo en [`.llm-wiki/wiki/bitacora-api.md`](../.llm-wiki/wiki/bitacora-api.md)** con el
   diff como evidencia. Esto es lo que hace que la proxima rotura se arregle en diez minutos.
5. Arreglar el schema zod y el parser, con un test que falle primero.

**Lo que NO se hace:** subir el umbral de la guarda del 50% para que la corrida "pase". La
guarda esta justamente para que una corrida incompleta no genere basura.

## Observabilidad (spec 003)

- `/admin` (solo el dueño): ultimas corridas, descartadas, grupos fallidos, deriva de
  `app_version`.
- Telegram al dueño si **3 corridas seguidas** se descartan o fallan. Un sistema que se rompe
  en silencio es peor que uno que no existe.
- Retencion con `pg_cron`: `precios_cambios` de mas de 90 dias y `hallazgos` cerrados de mas
  de 30 se borran.

## Que vigilar

| Señal | Que significa |
|---|---|
| `fin - inicio` de `corridas` creciendo | mas tiendas o mas productos; si pasa 5 min, revisar cadencia |
| `grupos_fallidos` no vacio seguido | un pasillo roto, o rate limiting: subir `msEntreRequests` |
| muchas `descartada` | la API cambio, o la tienda se reasigno (ver abajo) |
| alertas repetidas | bug en una de las 5 capas de anti-spam |

**La tienda de Rappi puede cambiar.** Si Rappi reasigna la zona, `resolverTiendas` devuelve otro
`store_id`, se crea otra fila en `tiendas` y el historial de la anterior queda huerfano: el
sistema vuelve al dia 0 del arranque ciego. Mitigacion en la spec 003: re-resolver las
direcciones semanalmente y avisar cuando pase. **No se migra el historial**: no vale la
complejidad.

## El token de invitado

Dura 7 dias. Re-autenticar en cada corrida serian cientos de pares passport+guest por mes desde
la misma IP de Actions: patron detectable. Se cachea en una tabla `credenciales_proveedor`
cerrada a `service_role`, y se renueva a los 6 dias o ante un 401.

## Supabase Auth

Registro **solo por invitacion** (spec 001, E15). Lo que hay configurado en el panel, y por que:

| Donde | Que | Por que |
|---|---|---|
| Authentication → Sign In / Providers | "Allow new users to sign up" **apagado** | es la barrera real. El `shouldCreateUser: false` de la web solo hace que el mensaje sea claro; con la clave publica cualquiera podria pedir el alta directo a la API |
| Authentication → Emails → SMTP | Resend, remitente en `httpsolutions.dev` | el SMTP interno da ~2 mails por hora (bloqueo B2) |
| Authentication → URL Configuration | Site URL = la de Vercel, **sin barra final**. Redirect URLs: `https://<vercel>/**` y `http://localhost:3000/**` | el magic link vuelve a la URL desde la que se pidio, si esta en la lista |
| Authentication → Emails → Magic Link | [`supabase/plantillas/magic-link.html`](../supabase/plantillas/magic-link.html) | link con `token_hash`: se pide en la compu y se abre en el celular |
| Authentication → Emails → Invite user | [`supabase/plantillas/invitacion.html`](../supabase/plantillas/invitacion.html) | idem, para la invitacion |

**Invitar a alguien** (hasta que exista la tabla `invitaciones` de la migracion 0010):
Authentication → Users → Invite user → su mail. Le llega la invitacion; despues entra siempre
con magic link.

**Si un link "vence" apenas llega:** algunos clientes de correo corporativos abren los links
para escanearlos y lo consumen. Con Gmail no pasa. Si pasa, la salida es una pagina intermedia
con un boton "Entrar" que haga el `verifyOtp` en el click y no en el GET.
