'use server';

import { crearDireccion } from '@buscapromos/db';
import { redirect } from 'next/navigation';
import { dispararBusqueda } from '@/lib/disparar-busqueda';
import { coordenadasValidas } from '@/lib/formato';
import { crearClienteServidor } from '@/lib/supabase/servidor';

export type EstadoDireccion = { error: string | null };

export async function guardarDireccion(_previo: EstadoDireccion, datos: FormData): Promise<EstadoDireccion> {
  const etiqueta = String(datos.get('etiqueta') ?? '').trim();
  const referencia = String(datos.get('referencia') ?? '').trim();
  const lat = Number(datos.get('lat'));
  const lng = Number(datos.get('lng'));

  if (!etiqueta) return { error: 'Ponele un nombre, como "Casa" o "Trabajo".' };
  if (etiqueta.length > 40) return { error: 'El nombre es muy largo.' };
  if (!coordenadasValidas(lat, lng)) {
    return { error: 'Marcá la ubicación en el mapa. Por ahora solo funciona en Argentina.' };
  }

  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const resultado = await crearDireccion(supabase, user.id, {
    etiqueta,
    texto: referencia.slice(0, 120) || etiqueta,
    lat,
    lng,
  });
  if (!resultado.ok) {
    return {
      error:
        resultado.motivo === 'etiqueta_repetida'
          ? `Ya tenés una dirección llamada "${etiqueta}". Elegí otro nombre.`
          : 'No pudimos guardar la dirección. Probá de nuevo.',
    };
  }

  await dispararBusqueda();
  redirect('/feed');
}
