'use server';

import { actualizarDireccion, borrarDireccion } from '@buscapromos/db';
import { redirect } from 'next/navigation';
import { dispararBusqueda } from '@/lib/disparar-busqueda';
import { coordenadasValidas } from '@/lib/formato';
import { crearClienteServidor } from '@/lib/supabase/servidor';

export type EstadoEdicion = { error: string | null };

export async function editarDireccion(id: string, _previo: EstadoEdicion, datos: FormData): Promise<EstadoEdicion> {
  const etiqueta = String(datos.get('etiqueta') ?? '').trim();
  const referencia = String(datos.get('referencia') ?? '').trim();
  const lat = Number(datos.get('lat'));
  const lng = Number(datos.get('lng'));
  if (!etiqueta) return { error: 'Ponele un nombre, como "Casa" o "Trabajo".' };
  if (etiqueta.length > 40) return { error: 'El nombre es muy largo.' };
  if (!coordenadasValidas(lat, lng)) return { error: 'Marcá la ubicación en el mapa. Por ahora solo funciona en Argentina.' };

  // RLS decide: si la direccion no es tuya, no se actualiza nada (spec 003, E11).
  const supabase = await crearClienteServidor();
  const r = await actualizarDireccion(supabase, id, { etiqueta, texto: referencia.slice(0, 120) || etiqueta, lat, lng });
  if (!r.ok) {
    return {
      error:
        r.motivo === 'etiqueta_repetida'
          ? `Ya tenés una dirección llamada "${etiqueta}". Elegí otro nombre.`
          : 'No pudimos guardar los cambios. Probá de nuevo.',
    };
  }
  // Moverla borro sus tiendas (trigger de la 0016): que el buscador las busque ya.
  if (r.movida) await dispararBusqueda();
  redirect(r.movida ? '/feed' : '/direcciones');
}

export async function eliminarDireccion(id: string): Promise<void> {
  const supabase = await crearClienteServidor();
  await borrarDireccion(supabase, id);
  redirect('/direcciones');
}
