import { NextResponse, type NextRequest } from 'next/server';
import { destinoSeguro, tipoOtp } from '@/lib/auth';
import { crearClienteServidor } from '@/lib/supabase/servidor';

/**
 * A donde apunta el link del mail (ver supabase/plantillas/). Se usa `token_hash` y no el
 * flujo PKCE a proposito: PKCE exige abrir el link en el mismo navegador que lo pidio, y el
 * caso normal aca es pedirlo en la compu y abrirlo en el celular.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get('token_hash');
  const tipo = tipoOtp(searchParams.get('type'));

  if (tokenHash && tipo) {
    const supabase = await crearClienteServidor();
    const { error } = await supabase.auth.verifyOtp({ type: tipo, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(destinoSeguro(searchParams.get('next')), request.url));
  }

  // Vencido, ya usado o adulterado: la misma salida para los tres (E3 de la spec 000).
  return NextResponse.redirect(new URL('/login?error=link', request.url));
}
