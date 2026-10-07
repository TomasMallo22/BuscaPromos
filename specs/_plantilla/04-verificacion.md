# NNN — <titulo> · Verificacion

> Se escribe **antes** de implementar. Escrito despues, describe lo que se hizo en vez de lo que
> hacia falta.

## Comandos

```bash
npm run verificar        # typecheck + lint + test + reglas + fixtures
npm run corrida:offline  # corrida completa contra fixtures, sin red
```

## Por nivel

| Nivel | Que se prueba | ¿Aplica? |
|---|---|---|
| 1 — deteccion pura | reloj inyectado, sin red ni DB | |
| 2 — parsing y crawl | contra `fixtures/<proveedor>/red/` | |
| 3 — DB y RLS | contra `supabase start`, con **dos JWT reales** | |
| 4 — consistencia estructural | `reglas:verificar`, lint rules, `grep` en CI | |
| 5 — end-to-end real | `probe.yml` y `corrida-seca.yml` en Actions | |

## Escenario por escenario

| Escenario | Como se verifica | Estado |
|---|---|---|
| E1 | | |

## Evidencia

> No alcanza con decir que pasa: hay que pegar la salida.
> `superpowers:verification-before-completion`.

## Antes de cerrar

- [ ] `npm run verificar` verde, con la salida pegada arriba
- [ ] Todos los escenarios de `01-escenarios.md` verificados
- [ ] Si toca RLS: probado con dos JWT reales, **no** con `service_role`
- [ ] `05-revision-adversarial.md` completa si corresponde
- [ ] `.llm-wiki/wiki/estado-actual.md` actualizado
- [ ] `docs/` desactualizados arreglados o anotados en `docs-desactualizados.md`
