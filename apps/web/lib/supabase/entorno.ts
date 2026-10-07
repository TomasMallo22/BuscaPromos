import { esClaveSecreta } from '../auth';

/**
 * Las dos variables publicas de Supabase. `process.env.NEXT_PUBLIC_*` se escribe literal para
 * que Next lo reemplace en el build: un acceso dinamico llegaria `undefined` al navegador.
 */
export function entornoSupabase(): { url: string; clavePublica: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clavePublica = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !clavePublica) {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY. Ver docs/12-trabajar-en-local.md.',
    );
  }
  // Cuarta capa de docs/10: si alguien pego la clave secreta en la variable publica, la web
  // se niega a arrancar antes de mandarla al navegador.
  if (esClaveSecreta(clavePublica)) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY tiene la clave SECRETA de Supabase. Cambiala por la publica ' +
        'y rotá la secreta en el panel: ya pudo haber llegado a un navegador. Ver docs/10-seguridad-rls.md.',
    );
  }
  return { url, clavePublica };
}
