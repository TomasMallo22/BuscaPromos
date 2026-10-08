import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { ClienteUsuario, Database } from '@buscapromos/db';
import { entornoSupabase } from './entorno';

/**
 * El cliente de Supabase con la sesion del usuario, para Server Components, Server Actions y
 * Route Handlers. Usa la clave publica: todo lo que lee pasa por RLS.
 */
export async function crearClienteServidor(): Promise<ClienteUsuario> {
  const almacen = await cookies();
  const { url, clavePublica } = entornoSupabase();

  return createServerClient<Database>(url, clavePublica, {
    cookies: {
      getAll: () => almacen.getAll(),
      setAll: (aEscribir) => {
        try {
          for (const { name, value, options } of aEscribir) almacen.set(name, value, options);
        } catch {
          // Un Server Component no puede escribir cookies. No hace falta: el middleware ya
          // refresco la sesion antes de que el componente corriera.
        }
      },
    },
  });
}
