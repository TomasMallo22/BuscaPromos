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

// ---------------------------------------------------------------------------
// Telegram y preferencias de avisos (spec 004)
// ---------------------------------------------------------------------------

/** Crea un vinculo de Telegram (token de un uso, 15 min) y devuelve el token. Lo hace la base: el usuario no escribe canales. */
export async function crearVinculoTelegram(cliente: ClienteUsuario): Promise<string> {
  const { data, error } = await cliente.rpc('crear_vinculo_telegram');
  if (error || !data) throw new Error(`No se pudo crear el vinculo: ${error?.message ?? 'sin token'}`);
  return data;
}

/** La llama el webhook con la clave publica, sin sesion. Devuelve si vinculo. */
export async function vincularTelegram(cliente: ClienteUsuario, token: string, chatId: string): Promise<boolean> {
  const { data, error } = await cliente.rpc('vincular_telegram', { p_token: token, p_chat_id: chatId });
  return !error && data === true;
}

export async function telegramConectado(cliente: ClienteUsuario): Promise<boolean> {
  const { count, error } = await cliente
    .from('canales_notificacion')
    .select('id', { count: 'exact', head: true })
    .eq('tipo', 'telegram')
    .eq('verificado', true);
  if (error) throw new Error(`No se pudo leer el canal: ${error.message}`);
  return (count ?? 0) > 0;
}

export async function desconectarTelegram(cliente: ClienteUsuario): Promise<void> {
  const { error } = await cliente.from('canales_notificacion').delete().eq('tipo', 'telegram');
  if (error) throw new Error(`No se pudo desconectar: ${error.message}`);
}

export async function guardarPreferenciasAvisos(
  cliente: ClienteUsuario,
  usuarioId: string,
  p: { categorias: readonly string[]; terminos: readonly string[] },
): Promise<void> {
  const { error } = await cliente
    .from('perfiles')
    .update({ avisos_categorias: [...p.categorias], avisos_terminos: [...p.terminos] })
    .eq('id', usuarioId);
  if (error) throw new Error(`No se pudieron guardar las preferencias: ${error.message}`);
}
