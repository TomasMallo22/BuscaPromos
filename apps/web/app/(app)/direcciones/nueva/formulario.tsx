'use client';

import { useActionState, useState } from 'react';
import { SelectorUbicacion, type Punto } from '@/componentes/selector-ubicacion';
import { guardarDireccion, type EstadoDireccion } from './acciones';

const claseInput =
  'block h-12 w-full rounded-lg border border-borde bg-superficie px-3 text-base outline-none focus:border-acento focus:ring-2 focus:ring-acento/30';

export function FormularioDireccion() {
  const [estado, accion, pendiente] = useActionState<EstadoDireccion, FormData>(guardarDireccion, { error: null });
  const [punto, setPunto] = useState<Punto | null>(null);

  return (
    <form action={accion} className="space-y-5">
      <SelectorUbicacion inicial={null} onCambio={setPunto} />

      <label className="block space-y-2">
        <span className="text-sm font-medium">Nombre</span>
        <input name="etiqueta" defaultValue="Casa" maxLength={40} required className={claseInput} />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium">
          Referencia <span className="font-normal text-texto-suave">(opcional, solo la ves vos)</span>
        </span>
        <input name="referencia" maxLength={120} placeholder="Ej.: Av. Corrientes 1234" className={claseInput} />
      </label>

      <input type="hidden" name="lat" value={punto?.lat ?? ''} />
      <input type="hidden" name="lng" value={punto?.lng ?? ''} />

      {estado.error && (
        <p role="alert" className="text-sm text-error">
          {estado.error}
        </p>
      )}

      <button
        type="submit"
        disabled={!punto || pendiente}
        className="h-12 w-full rounded-lg bg-acento font-medium text-acento-texto disabled:opacity-50"
      >
        {pendiente ? 'Guardando…' : 'Guardar y buscar ofertas'}
      </button>

      <p className="text-xs text-texto-suave">Tu dirección la ves solo vos. Se usa para saber qué tiendas de Rappi te llegan.</p>
    </form>
  );
}
