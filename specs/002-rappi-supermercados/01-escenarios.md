# 002 — Supermercados de Rappi · Escenarios

## Camino principal

### E1 — Cargo mi direccion de noche y veo supermercados
- **Dado** que son las 23:00 y Turbo no aparece en el router
- **Cuando** guardo mi direccion
- **Entonces** la direccion se resuelve con los supermercados que si aparecen, me suscribo a
  cada uno, y la primera pasada los recorre. El feed muestra productos con el nombre de la tienda

### E2 — Turbo se suma solo a la mañana
- **Dado** una direccion resuelta de noche sin Turbo
- **Cuando** Turbo vuelve a aparecer en el router
- **Entonces** en la proxima re-resolucion (cada hora) se crea la tienda Turbo y la suscripcion,
  sin que el usuario haga nada

### E3 — Mas barato que en otras tiendas
- **Dado** un producto con `master_product_id` que esta en Coto a $1.000 y en otras 3 tiendas
  a una mediana de $2.500
- **Cuando** su precio cambia en Coto
- **Entonces** dispara `vs_otras_tiendas` con ratio 0.4 y referencia $2.500, desde la primera
  pasada, sin esperar historial

### E4 — Cada tienda a su ritmo
- **Dado** que Turbo corrio hace 31 minutos y Jumbo hace 2 horas
- **Cuando** corre el cron
- **Entonces** se recorre Turbo y no Jumbo

## Bordes

### E5 — Una sola tienda mas
- **Dado** un producto que solo esta en otra tienda ademas de esta
- **Entonces** `vs_otras_tiendas` **no** opina: con una sola referencia, un error de precio en
  la otra tienda se convierte en un falso positivo convincente. Hacen falta 2

### E6 — Una tienda deja de aparecer en el router
- **Entonces** no se borra ni se desuscribe: de noche o por un rato, Rappi esconde tiendas que
  siguen existiendo

### E7 — Nada aparece en 24 horas
- **Dado** una direccion que nunca encontro ninguna tienda
- **Entonces** queda `sin_cobertura`, como en la spec 001

## Lo que NO tiene que pasar

### E8 — Comparar con un precio que no aplica
- La mediana de otras tiendas **no** incluye precios sin stock ni promos excluidas
  (`promo_usuario_nuevo`): son las cuatro exclusiones de docs/04

### E9 — Comparar por nombre
- Un producto sin `master_product_id` ni EAN **no** entra a `vs_otras_tiendas` (regla de oro 15)

## Escenarios de las reglas de oro

| Regla | Escenario |
|---|---|
| 5 — nunca sin stock ni promos que no aplican | E8 |
| 13 — un usuario ve solo sus tiendas | sin cambios: cada tienda nueva va con su suscripcion |
| 14 — direcciones son datos personales | la re-resolucion horaria no loguea coordenadas |
| 15 — no comparar sobre identidad dudosa | E9 |
| 16 — volumen bajo | E4: supermercados cada 4 horas |
