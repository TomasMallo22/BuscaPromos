# 001 — Rappi end-to-end · Verificacion

## Comandos

```bash
npm run verificar        # typecheck + lint + test + reglas + fixtures
npm run corrida:offline  # corrida completa contra fixtures, sin red, sin escribir
python scripts/validar-casos-contra-original.py <ruta al repo de Ivo>
```

## Por nivel

| Nivel | Que | Aplica |
|---|---|---|
| 1 — deteccion pura | reloj inyectado, sin red ni DB | **si, es el nucleo** |
| 2 — parsing y crawl | contra `fixtures/rappi/red/` | si |
| 3 — DB y RLS | `aplicar_lote_precios` + **dos JWT reales** | si |
| 4 — consistencia estructural | `reglas:verificar`, lint rules, greps | si |
| 5 — end-to-end real | `corrida-seca.yml` en Actions | si |

## Escenario por escenario

| Escenario | Como se verifica | Estado |
|---|---|---|
| E1 primera corrida sin alertas | test de `aplicar_lote_precios` + corrida seca | ⏳ |
| E2 segunda corrida, cero cambios | **el test que defiende la regla de oro 2** | ⏳ |
| E3 caida fuerte dispara | caso sintetico + test del motor | ⏳ |
| E4 se ve en la web | manual, desde el celular | ⏳ |
| E5 arranque ciego | el feed muestra el banner | ⏳ |
| E6 corrida al 40% se descarta | test con catalogo recortado | ⏳ |
| E7 grupo fallido no marca sin stock | test con `falloMotivo` | ⏳ |
| E8 anidamiento extra | **tomar el fixture y envolverlo dos niveles** | ⏳ |
| E9 401 renueva el token | test con cliente que devuelve 401 una vez | ⏳ |
| E10-E11 no se alerta sin stock ni promo nueva | tests del motor | ⏳ |
| E12 no se repite | test de `guardarAlerta` con baja del 0.8% | ⏳ |
| E13 oscilacion ±1% | **20 corridas simuladas, a lo sumo un aviso** | ⏳ |
| E14 A no ve datos de B | **dos JWT reales, nunca `service_role`** | ⏳ |
| E15 sin invitacion no entra | test del trigger de 0010 | ⏳ |
| E16-E19 filtros de dos niveles | tests del fan-out, los cuatro casos | ⏳ |

**E18 es el escenario que no se puede romper**: algo fuera de la lista con ratio 0.20 **tiene
que llegar**. Es la razon de ser de la red de seguridad.

## Evidencia

> No alcanza con decir que pasa: hay que pegar la salida.
> `superpowers:verification-before-completion`.

## Antes de cerrar

- [ ] `npm run verificar` verde, con la salida pegada
- [ ] Los 19 escenarios verificados
- [ ] El oraculo en Python sigue dando los 25 chequeos OK
- [ ] RLS probado con dos JWT reales
- [ ] Ningun dato personal en el repo, en logs ni en artifacts
- [ ] `05-revision-adversarial.md` completa — **obligatoria**: toca el motor, el anti-spam, RLS
      y datos personales
- [ ] `.llm-wiki/wiki/estado-actual.md` actualizado
- [ ] Los scripts fantasma del `package.json`, resueltos
