'use client';

import { useActionState, useState } from 'react';
import { SelectorUbicacion, type Punto } from '@/componentes/selector-ubicacion';
import { editarDireccion, eliminarDireccion, type EstadoEdicion } from './acciones';

const claseInput =
  'block h-12 w-full rounded-lg border border-borde bg-superficie px-3 text-base outline-none focus:border-acento focus:ring-2 focus:ring-acento/30';

export function FormularioEdicion({
  direccion,
}: {
  direccion: { id: string; etiqueta: string; texto: string; lat: number; lng: number };
}) {
  const [estado, accion, pendiente] = useActionState<EstadoEdicion, FormData>(editarDireccion.bind(null, direccion.id), {
    error: null,
  });
  const [punto, setPunto] = useState<Punto>({ lat: direccion.lat, lng: direccion.lng });
  const movida = punto.lat !== direccion.lat || punto.lng !== direccion.lng;
  const [borrando, setBorrando] = useState(false);

  return (
    <div className="space-y-8">
      <form action={accion} className="space-y-5">
        <label className="block space-y-2">
          <span className="text-sm font-medium">Nombre</span>
          <input name="etiqueta" defaultValue={direccion.etiqueta} maxLength={40} required className={claseInput} />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium">
            Referencia <span className="font-normal text-texto-suave">(opcional, solo la ves vos)</span>
          </span>
          <input
            name="referencia"
            maxLength={120}
            defaultValue={direccion.texto === direccion.etiqueta ? '' : direccion.texto}
            className={claseInput}
          />
        </label>

        <SelectorUbicacion inicial={{ lat: direccion.lat, lng: direccion.lng }} onCambio={setPunto} />

        <input type="hidden" name="lat" value={punto.lat} />
        <input type="hidden" name="lng" value={punto.lng} />

        {movida && (
          <p className="rounded-lg border border-neutro/40 p-3 text-sm text-texto-suave">
            Cambiaste la ubicación: al guardar volvemos a buscar qué tiendas de Rappi te llegan ahí.
          </p>
        )}

        {estado.error && (
          <p role="alert" className="text-sm text-error">
            {estado.error}
          </p>
        )}

        <button type="submit" disabled={pendiente} className="h-12 w-full rounded-lg bg-acento font-medium text-acento-texto disabled:opacity-50">
          {pendiente ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </form>

      <form
        action={async () => {
          setBorrando(true);
          await eliminarDireccion(direccion.id);
        }}
        onSubmit={(e) => {
          if (!confirm(`¿Borrar "${direccion.etiqueta}"? Dejás de ver las ofertas de sus tiendas.`)) e.preventDefault();
        }}
      >
        <button type="submit" disabled={borrando} className="h-12 w-full rounded-lg border border-error font-medium text-error disabled:opacity-50">
          {borrando ? 'Borrando…' : 'Borrar esta dirección'}
        </button>
      </form>
    </div>
  );
}
