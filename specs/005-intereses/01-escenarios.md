# 005 — Mis intereses · Escenarios

## Camino principal

### E1 — El feed muestra lo que me interesa
- **Dado** que elegi "Lácteos y quesos" y escribi "aceite de oliva"
- **Cuando** abro el feed sin filtros
- **Entonces** veo las detecciones y los descuentos anunciados de lacteos y de aceites de
  oliva, y arriba dice que estoy viendo "Mis intereses"

### E2 — Lo extremo pasa aunque no me interese
- **Dado** el mismo usuario
- **Cuando** un vino baja a menos de la mitad de su precio habitual
- **Entonces** aparece en el feed y me llega por Telegram

### E3 — Lo que no es extremo ni me interesa no aparece
- Un shampoo "Más barato que en otras tiendas", o un descuento anunciado de 60% en un vino: no
  aparecen en "Mis intereses" ni llegan por Telegram

### E4 — Ver todo
- **Cuando** toco "Ver todo"
- **Entonces** veo todo, como antes de esta spec, y puedo volver a "Mis intereses"

### E5 — Un filtro explicito manda
- **Cuando** toco la categoria "Bebidas" o busco "vino"
- **Entonces** veo todo lo de esa categoria o esa busqueda, me interese o no

## Bordes

### E6 — Sin intereses
- **Dado** que no elegi nada
- **Entonces** el feed muestra todo y me invita a elegir mis intereses en Ajustes; por Telegram
  no me llega nada (opt-in, spec 004)

### E7 — Tildes y la ultima letra
- "azucar" encuentra "Azúcar"; "yogurt" encuentra "Yogur" (la misma busqueda que Telegram)

### E8 — La pareja
- Cada uno ve sus intereses: los de uno no cambian el feed del otro
