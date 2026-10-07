---
name: verificar-antes-de-cerrar
description: La checklist para cerrar una spec o un PR de BuscaPromos — correr las verificaciones, pegar la evidencia, y actualizar la wiki. Usar antes de decir que algo esta listo, funcionando o pasando.
---

# Verificar antes de cerrar

Complementa `superpowers:verification-before-completion` con lo especifico de este repo.

**Evidencia antes de afirmaciones.** No alcanza con decir que pasa: hay que correr el comando y
pegar la salida.

## El gate

```bash
npm run verificar
# = typecheck && lint && test && reglas:verificar && fixtures:verificar
```

Y, si la spec toco el crawler o un proveedor:

```bash
npm run corrida:offline   # corrida completa con deteccion, contra fixtures, sin red
```

## Los 5 niveles

| Nivel | Que prueba | Cuando aplica |
|---|---|---|
| 1 | deteccion pura, reloj inyectado, sin I/O | si tocó `packages/core` |
| 2 | parsing y crawl contra `fixtures/*/red/` | si tocó `packages/providers` |
| 3 | DB y RLS contra `supabase start` | si tocó migraciones o `packages/db` |
| 4 | consistencia estructural, en CI | siempre |
| 5 | end-to-end real en Actions | si tocó un cliente de proveedor |

El nivel 5 es `corrida-seca.yml`: crawl real y deteccion real **sin escribir en la DB**. Se
corre **antes de mergear cualquier cambio a un cliente de proveedor**. Imprime los hallazgos en
el `GITHUB_STEP_SUMMARY`.

## Lo que mas se olvida

- **Los tests de RLS con dos JWT reales**, no con `service_role`. Un test de RLS escrito con
  `service_role` pasa siempre y no prueba nada. Si tocaste una policy y el test paso en el
  primer intento, verificá con que cliente lo corriste.
- **`npm run db:reset` desde cero.** Una migracion que solo funciona aplicada sobre tu base
  actual no funciona.
- **`npm run db:tipos` corrido y commiteado** despues de cambiar el esquema.
- **La wiki.** Una spec cerrada que no se refleja en
  `.llm-wiki/wiki/estado-actual.md` es una spec que la proxima sesion va a volver a planificar.
  Comando `/wiki`.

## Antes de pushear

- [ ] `npm run verificar` verde, **con la salida pegada**
- [ ] Todos los escenarios de `01-escenarios.md` verificados uno por uno
- [ ] Si toca RLS: dos JWT reales
- [ ] Si toca el motor: el caso `$700 → $1400 → $700 = inflado` sigue pasando
- [ ] Si toca el anti-spam: el test de las 20 corridas oscilando
- [ ] `05-revision-adversarial.md` completa si corresponde
- [ ] Ningun dato personal en el repo, en un log ni en un artifact
- [ ] Ninguna clave de regla como string literal fuera del registry
- [ ] Ningun `supabase.from(` fuera de `packages/db`
- [ ] `.llm-wiki/wiki/estado-actual.md` actualizado
- [ ] `docs/` desactualizados arreglados, o anotados en `docs-desactualizados.md`
- [ ] Branch propia, un tema, mensaje en castellano

## Lo que no cuenta como verificado

- "El codigo se ve bien."
- "Los tipos compilan." (compila ≠ funciona)
- "Los tests pasan" sin haber corrido los tests.
- "Deberia funcionar."
- Un test que no se vio **fallar** antes de implementar: puede estar probando nada.
