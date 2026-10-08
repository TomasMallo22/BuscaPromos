import { misDirecciones, type DireccionDelUsuario } from '@buscapromos/db';
import Link from 'next/link';
import { crearClienteServidor } from '@/lib/supabase/servidor';

const ESTADO: Record<DireccionDelUsuario['estado'], string> = {
  buscando_tienda: 'Buscando sus tiendas de Rappi',
  resuelta: 'Buscando ofertas',
  sin_cobertura: 'Rappi no llega acá',
};

export default async function PaginaDirecciones() {
  const supabase = await crearClienteServidor();
  const direcciones = await misDirecciones(supabase);

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-semibold">Tus direcciones</h1>
      {direcciones.length > 0 && (
        <ul className="divide-y divide-borde rounded-xl border border-borde bg-superficie">
          {direcciones.map((d) => (
            <li key={d.id} className="flex min-h-14 items-center justify-between gap-4 px-4 py-3">
              <span className="font-medium">{d.etiqueta}</span>
              <span className="text-right text-sm text-texto-suave">{ESTADO[d.estado]}</span>
            </li>
          ))}
        </ul>
      )}
      <Link
        href="/direcciones/nueva"
        className="flex h-12 w-full items-center justify-center rounded-lg bg-acento font-medium text-acento-texto"
      >
        Agregar una dirección
      </Link>
    </div>
  );
}
