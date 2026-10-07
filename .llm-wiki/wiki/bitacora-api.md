# Bitacora de APIs

_Historico a proposito: su valor esta en el registro de roturas._

Una entrada por cada vez que una API externa cambio, rompio o se arreglo. Formato:

```
## YYYY-MM-DD — <proveedor>: <que paso en una linea>
**Sintoma:** que se vio (codigo HTTP, campo faltante, corrida descartada).
**Causa:** que cambio del otro lado.
**Arreglo:** que se toco, con el commit o el PR.
**Evidencia:** el run del `probe`, el diff del fixture.
```

El diff entre el fixture viejo y la captura nueva del `probe` es la evidencia mas util:
dice exactamente que campo se movio. `npm run fixtures:promover` lo imprime.

---

## 2026-10-07 — Rappi: linea base documentada, sin verificar en vivo

**Sintoma:** ninguno todavia. Entrada inicial.
**Causa:** —
**Arreglo:** —
**Evidencia:** el flujo de 4 pasos y los headers salen de leer
`turbo/api.py` de `ivokalaizic/rappi-turbo-radar` en el commit `431cb3f`. `app_version` en uso
ahi: `web_v1.223.2`. **No se confirmo con un request real**: la red del contenedor esta
cerrada (ver `bloqueos.md`). El primer `probe` en Actions es lo que convierte esto en un hecho.
