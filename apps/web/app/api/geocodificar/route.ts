import { NextResponse, type NextRequest } from 'next/server';
import { candidatosGeoref, PROVINCIAS, urlGeoref } from '@/lib/geocodificar';
import { crearClienteServidor } from '@/lib/supabase/servidor';

/**
 * Direccion escrita -> candidatos con coordenadas. Pasa por el servidor y no va directo del
 * navegador a Georef para que solo lo use alguien con sesion (el middleware ya corta el resto;
 * esto lo repite porque una API sin sesion es una puerta).
 *
 * El texto es un dato personal: no se loguea, ni aca ni en el error (regla de oro 14).
 */
export async function GET(request: NextRequest) {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'sin sesion' }, { status: 401 });

  const texto = (request.nextUrl.searchParams.get('q') ?? '').trim().slice(0, 120);
  const provinciaPedida = request.nextUrl.searchParams.get('provincia');
  const provincia = PROVINCIAS.some((p) => p.id === provinciaPedida) ? provinciaPedida : null;
  if (texto.length < 3) return NextResponse.json({ candidatos: [] });

  try {
    const r = await fetch(urlGeoref(texto, provincia), { signal: AbortSignal.timeout(8000), cache: 'no-store' });
    if (!r.ok) return NextResponse.json({ error: 'georef' }, { status: 502 });
    return NextResponse.json({ candidatos: candidatosGeoref(await r.json()) });
  } catch {
    return NextResponse.json({ error: 'georef' }, { status: 502 });
  }
}
