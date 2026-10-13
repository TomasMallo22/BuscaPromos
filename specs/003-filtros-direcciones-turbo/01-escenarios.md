# 003 — Turbo completo, filtro por categoria y direcciones editables · Escenarios

## Camino principal

### E1 — Mi casa esta al borde de la Turbo clasica
- **Dado** una ubicacion donde el router devuelve `turbo_veinticuatro_nc` y no `turbo`
- **Entonces** la direccion se resuelve con "Rappi Turbo 24 hs" y se recorre cada 30 minutos

### E2 — Cargo la direccion escribiendola
- **Cuando** escribo "Av. Corrientes 1000, CABA" y busco
- **Entonces** veo los candidatos, elijo uno, el pin va ahi, lo puedo ajustar, y guardo

### E3 — Edito el nombre
- **Entonces** cambia el nombre y nada mas: no se vuelven a buscar tiendas

### E4 — Muevo el pin
- **Entonces** se borran sus tiendas y suscripciones, vuelve a "buscando tus tiendas", se
  dispara el buscador. Las tiendas de mis OTRAS direcciones no se tocan

### E5 — Borro una direccion
- **Entonces** se borran sus suscripciones. Si nadie mas esta suscripto a esa tienda, el
  buscador deja de recorrerla

### E6 — Filtro por categoria
- **Cuando** toco "Lácteos"
- **Entonces** el feed muestra solo hallazgos y descuentos de lacteos, de todas mis tiendas.
  "Todas" vuelve al feed completo

### E7 — Busco por nombre
- **Cuando** escribo "yogur"
- **Entonces** solo productos cuyo nombre contiene "yogur", sin importar mayusculas

## Bordes

### E8 — La direccion escrita no existe
- **Entonces** "No encontramos esa dirección. Probá con calle y altura, o marcala en el mapa."

### E9 — "Sin cobertura" de noche
- **Dado** una direccion creada a las 23:00 y un buscador que no vuelve a correr de dia
- **Entonces** NO se marca sin cobertura: hace falta al menos un intento fallido de dia (10 a
  20 h ART) y mas de 24 h. Una direccion sin cobertura se reintenta una vez por dia

### E10 — El buscador cada 30 minutos de verdad
- **Entonces** Supabase (`pg_cron` + `pg_net`) dispara `corrida.yml` cada 30 minutos con el
  token guardado en su Vault. El cron de GitHub queda como respaldo

## Lo que NO tiene que pasar

### E11 — Mover o borrar la direccion de otro
- RLS: solo el dueño de la direccion la edita o la borra (regla de oro 13)

### E12 — La direccion escrita en un log
- El texto y las coordenadas no se loguean, ni en Vercel ni en Actions (regla de oro 14)

## Escenarios de las reglas de oro

| Regla | Escenario |
|---|---|
| 13 — RLS | E11 |
| 14 — direcciones son datos personales | E12 |
| 16 — volumen bajo | E1: solo dos de las diez Turbo |
