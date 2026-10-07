/**
 * Lo que la web lee de la cuenta del usuario. Recibe el cliente con la sesion del usuario
 * (anon key + su JWT), asi que RLS filtra todo: ninguna de estas funciones filtra por
 * `usuario_id` a mano, porque si hiciera falta, la policy estaria mal (regla de oro 13).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Tables } from './tipos.js';

/** El cliente con la sesion de una persona. Nunca el de `service_role`. */
export type ClienteUsuario = SupabaseClient<Database>;

export async function contarDireccionesActivas(cliente: ClienteUsuario): Promise<number> {
  const { count, error } = await cliente
    .from('direcciones')
    .select('id', { count: 'exact', head: true })
    .eq('activa', true);
  if (error) throw new Error(`No se pudieron contar las direcciones: ${error.message}`);
  return count ?? 0;
}

/** El perfil lo crea un trigger al registrarse (0007); `null` si por algo no esta. */
export async function obtenerPerfil(cliente: ClienteUsuario): Promise<Tables<'perfiles'> | null> {
  const { data, error } = await cliente.from('perfiles').select('*').maybeSingle();
  if (error) throw new Error(`No se pudo leer el perfil: ${error.message}`);
  return data;
}
