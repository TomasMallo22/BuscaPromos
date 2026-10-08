/**
 * `packages/db` es la UNICA capa de acceso a datos del proyecto.
 *
 * Ningun `supabase.from(` vive fuera de acá — hay un `grep` en CI que lo verifica. La razon:
 * si la web y el crawler consultan igual, una sola capa tiene los tipos y las policies en la
 * cabeza, y un cambio de esquema rompe un solo lugar.
 *
 * El cliente `service_role` NO se exporta desde acá: vive en `./servicio.ts`, que `apps/web`
 * tiene prohibido importar (lint rule + grep en CI + throw en runtime). Saltea RLS por diseño,
 * asi que en el bundle del front expondria la base entera. Ver docs/10-seguridad-rls.md.
 */
export type {
  Database,
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
} from './tipos.js';
export { Constants } from './tipos.js';

export type { ClienteUsuario } from './usuarios.js';
export { contarDireccionesActivas, obtenerPerfil } from './usuarios.js';
export {
  crearDireccion,
  descuentosAnunciados,
  hallazgosVigentes,
  misDirecciones,
  misTiendas,
  type DescuentoAnunciado,
  type DireccionDelUsuario,
  type HallazgoEnFeed,
  type ResultadoNuevaDireccion,
  type TiendaDelUsuario,
} from './feed.js';
