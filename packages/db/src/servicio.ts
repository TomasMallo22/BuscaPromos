/**
 * El cliente con la clave SECRETA de Supabase. Saltea RLS por diseño: solo lo usan el crawler
 * y los scripts, que corren en Actions.
 *
 * `apps/web` tiene prohibido importar este archivo (lint rule + grep en CI). Esto es la cuarta
 * capa de docs/10-seguridad-rls.md: si igual llega a un navegador, explota antes de crear el
 * cliente.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './tipos.js';

export type ClienteServicio = SupabaseClient<Database>;

export function crearClienteServicio(url: string, claveSecreta: string): ClienteServicio {
  if ('window' in globalThis) {
    throw new Error('El cliente con la clave secreta de Supabase no puede correr en un navegador. Nunca.');
  }
  return createClient<Database>(url, claveSecreta, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
