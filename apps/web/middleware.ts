import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@buscapromos/db';
import { DESTINO_POR_DEFECTO, esRutaPublica } from './lib/auth';
import { entornoSupabase } from './lib/supabase/entorno';

/**
 * Corre antes de cada pagina: refresca la sesion (el access token dura una hora) y manda a
 * `/login` a quien no la tiene. Las pantallas igual chequean el usuario: esto es comodidad,
 * no la barrera. La barrera es RLS.
 */
export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Si la URL de redireccion del magic link no esta en la lista permitida de Supabase, el
  // link cae en la Site URL pelada (`/?token_hash=...`). Se lo manda a donde iba.
  if (pathname === '/' && searchParams.has('token_hash')) {
    const confirmar = request.nextUrl.clone();
    confirmar.pathname = '/auth/confirm';
    return NextResponse.redirect(confirmar);
  }

  let respuesta = NextResponse.next({ request });
  const { url, clavePublica } = entornoSupabase();
  const supabase = createServerClient<Database>(url, clavePublica, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (aEscribir) => {
        for (const { name, value } of aEscribir) request.cookies.set(name, value);
        respuesta = NextResponse.next({ request });
        for (const { name, value, options } of aEscribir) respuesta.cookies.set(name, value, options);
      },
    },
  });

  // getUser y no getSession: getSession confia en la cookie sin validarla contra Auth.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !esRutaPublica(pathname)) return redirigir(request, respuesta, '/login');
  if (user && pathname === '/login') return redirigir(request, respuesta, DESTINO_POR_DEFECTO);
  return respuesta;
}

/** Redirige sin perder las cookies de sesion que Supabase acaba de refrescar. */
function redirigir(request: NextRequest, respuesta: NextResponse, ruta: string) {
  const destino = request.nextUrl.clone();
  destino.pathname = ruta;
  destino.search = '';
  const redireccion = NextResponse.redirect(destino);
  for (const cookie of respuesta.cookies.getAll()) redireccion.cookies.set(cookie);
  return redireccion;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)'],
};
