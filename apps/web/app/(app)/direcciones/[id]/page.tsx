import { obtenerDireccion } from '@buscapromos/db';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { FormularioEdicion } from './formulario';

export default async function PaginaEditarDireccion({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await crearClienteServidor();
  // RLS: si no es tuya, no existe.
  const direccion = await obtenerDireccion(supabase, id).catch(() => null);
  if (!direccion) notFound();

  return (
    <div className="space-y-5">
      <div>
        <Link href="/direcciones" className="text-sm text-texto-suave">
          ← Direcciones
        </Link>
        <h1 className="mt-2 text-lg font-semibold">Editar “{direccion.etiqueta}”</h1>
      </div>
      <FormularioEdicion direccion={direccion} />
    </div>
  );
}
