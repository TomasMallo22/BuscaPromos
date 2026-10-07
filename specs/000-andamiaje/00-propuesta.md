# 000 — Andamiaje SDD + esqueleto · Propuesta

## El problema

El repo estaba vacio. No hay forma de empezar a construir BuscaPromos sin antes decidir y
**escribir** como se trabaja: que invariantes tiene el dominio, donde vive cada cosa, y como se
verifica que algo funciona.

Hay un riesgo concreto, no hipotetico: el proyecto del que se porta la logica tiene cinco
limitaciones estructurales (no hay dimension proveedor, la identidad de producto es propietaria,
la taxonomia esta fija en dos niveles, un booleano carga dos significados, y las claves de regla
son strings repetidos en cinco archivos). Sin algo escrito que las prohiba explicitamente, se
reintroducen solas.

## Para quien

- **El dueño**, que esta aprendiendo y necesita entrar desde el celular y ver que existe algo.
- **Quien mantenga el sistema** (una sesion de Claude Code, dentro de tres meses, sin este
  contexto): necesita poder ubicarse en cinco minutos.

## Como sabemos que se resolvio

**El dueño abre la web en el celular, pone su mail, le llega un link, entra, y ve una pantalla
vacia que dice "cargá una dirección para empezar".**

Nada mas que eso. Pero ademas: una sesion nueva que lee `.llm-wiki/index.md` y `CLAUDE.md`
sabe que esta hecho, que falta, que esta bloqueado y que no tiene que hacer.

## Que queda afuera

- Cualquier scraping. No se toca ninguna API externa.
- El motor de deteccion. Se **documenta** (`docs/03`), no se implementa.
- La pantalla de direcciones, el feed con datos, Telegram.
- Las migraciones de catalogo, precios y hallazgos (0002-0006). Solo van las de usuarios, que
  son las que auth necesita para funcionar end-to-end.

## Preguntas abiertas

| Pregunta | Quien decide | Estado |
|---|---|---|
| ¿Se versionan `docs/`, `specs/`, `.llm-wiki/` y `.claude/`? | el dueño | **si**, al reves que en CirculoAjedrezBeccar. Ver ADR 0003 y `docs/10` |
| ¿Repo publico o privado? | el dueño | **publico**. ADR 0008. Falta hacer el cambio en GitHub |
| ¿SMTP propio desde el dia 1? | el dueño | **si**: sin eso el login se rompe con 3 usuarios |
| ¿Nivel de acceso de red del entorno? | el dueño | pendiente. Ver `.llm-wiki/wiki/bloqueos.md` B1 |
