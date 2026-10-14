# 005 — Mis intereses · Verificacion

## Comandos

```bash
npm run verificar
```

## Por nivel

| Nivel | Que se prueba | ¿Aplica? |
|---|---|---|
| 1 — deteccion pura | `interesa`, `seMuestra`, `extrema` del registry | si |
| 2 — parsing y crawl | — | no |
| 3 — DB y RLS | sin migracion; el feed sigue leyendo con el JWT del usuario | no |
| 4 — consistencia estructural | `reglas:verificar`, lint | si |
| 5 — end-to-end real | el dueño mira el feed en el celular | si |

## Escenario por escenario

| Escenario | Como se verifica | Estado |
|---|---|---|
| E1 | test de `seMuestra` + feed en el celular | |
| E2 | test de `elegirHallazgos` con una `caida_vs_historial` fuera de intereses | |
| E3 | tests: `vs_otras_tiendas` y descuento anunciado fuera de intereses no pasan | |
| E4, E5, E6 | feed en el celular | |
| E7 | tests de `coincideTermino` y del patron de `ilike` | |
| E8 | los intereses salen de `perfiles` del usuario logueado (RLS de 0019) | |

## Antes de cerrar

- [ ] `npm run verificar` verde
- [ ] El dueño probo E1 a E6 en el celular
- [ ] `.llm-wiki/wiki/estado-actual.md` actualizado
