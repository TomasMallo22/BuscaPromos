import { contarDireccionesActivas } from '@buscapromos/db';
import type { ReactNode } from 'react';
import { crearClienteServidor } from '@/lib/supabase/servidor';

/**
 * El feed. Hoy no hay `hallazgos` (llegan con la spec 001), asi que solo existen los dos
 * primeros estados vacios de docs/14. Los estados vacios son features: sin ellos el dueño
 * concluye que no funciona justo cuando funciona como se diseño.
 */
export default async function PaginaFeed() {
  const supabase = await crearClienteServidor();
  const direcciones = await contarDireccionesActivas(supabase);

  if (direcciones === 0) {
    return (
      <EstadoVacio titulo="Cargá una dirección para empezar">
        Las promos dependen de qué tiendas te llegan, y eso depende de dónde estás. Por ahora la
        dirección la carga quien te invitó; la pantalla para cargarla vos llega pronto.
      </EstadoVacio>
    );
  }

  return (
    <EstadoVacio titulo="Buscando por primera vez">
      Esto tarda unos minutos. Después hacen falta unos días de historial para distinguir una
      oferta real de un precio tachado inflado.
    </EstadoVacio>
  );
}

function EstadoVacio({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-borde bg-superficie p-5">
      <h1 className="text-lg font-semibold">{titulo}</h1>
      <p className="mt-2 text-texto-suave">{children}</p>
    </section>
  );
}
