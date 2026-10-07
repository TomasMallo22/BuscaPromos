# 000 — Andamiaje SDD + esqueleto · Escenarios

## Camino principal

### E1 — El dueño entra por primera vez
- **Dado** que no tiene cuenta
- **Cuando** pone su mail en `/login` y abre el link que le llega
- **Entonces** entra, se le crea una fila en `perfiles`, y ve `/feed` con el estado vacio
  "cargá una dirección para empezar"

### E2 — Una sesion nueva se ubica
- **Dado** una sesion de Claude Code sin contexto de esta conversacion
- **Cuando** lee `.llm-wiki/index.md` y `CLAUDE.md`
- **Entonces** sabe el stack, las 16 reglas de oro, que esta hecho, que falta y que esta
  bloqueado, sin leer una linea de codigo

## Bordes

### E3 — Magic link vencido o ya usado
- **Entonces** mensaje claro y la opcion de pedir otro. Nunca una pantalla en blanco ni un
  stack trace

### E4 — Se pide el link tres veces seguidas
- **Entonces** no se agota la cuota. Es justamente por esto que hace falta el SMTP de Resend:
  el interno de Supabase da ~2 mails por hora (bloqueo B2)

## Lo que NO tiene que pasar

### E5 — `service_role` no llega al navegador
- **Cuando** se buildea `apps/web`
- **Entonces** la clave `service_role` no aparece en ningun bundle. Verificado por lint, por
  `grep` en CI, y por un throw en runtime (regla de oro 13, `docs/10`)

### E6 — Un usuario no ve datos de otro
- **Dado** dos usuarios A y B con suscripciones a tiendas distintas
- **Cuando** A consulta con su JWT real
- **Entonces** no lee ninguna fila de B. Probado con **dos JWT reales, no con `service_role`**

### E7 — No hay datos personales en el repo
- **Entonces** ni direcciones, ni coordenadas, ni tokens, ni `chat_id`. El repo es publico
  (regla de oro 14)

## Escenarios de las reglas de oro

| Regla | Escenario |
|---|---|
| 13 — RLS garantiza el aislamiento | E6 |
| 14 — las direcciones son datos personales | E7 |
