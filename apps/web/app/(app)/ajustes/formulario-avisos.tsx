'use client';

import { CATEGORIAS } from '@buscapromos/core';
import { useActionState } from 'react';
import { guardarAvisos, type EstadoAvisos } from './acciones';

export function FormularioAvisos({ categorias, terminos }: { categorias: readonly string[]; terminos: readonly string[] }) {
  const [estado, accion, pendiente] = useActionState<EstadoAvisos, FormData>(guardarAvisos, { mensaje: null, error: null });

  return (
    <form action={accion} className="space-y-5">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Categorías</legend>
        <p className="text-sm text-texto-suave">Lo que BuscaPromos detecte en estas categorías.</p>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIAS.map((c) => (
            <label key={c.clave} className="flex min-h-11 items-center gap-2 rounded-lg border border-borde bg-superficie px-3">
              <input type="checkbox" name="categorias" value={c.clave} defaultChecked={categorias.includes(c.clave)} className="h-5 w-5 accent-acento" />
              <span className="text-sm">{c.nombre}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block space-y-2">
        <span className="text-sm font-medium">Productos</span>
        <span className="block text-sm text-texto-suave">
          Uno por línea. Lo que detectemos y, además, los descuentos que anuncie Rappi (por Telegram, desde 30%).
        </span>
        <textarea
          name="terminos"
          defaultValue={terminos.join('\n')}
          rows={5}
          placeholder={'aceite de oliva\nyogurt natural\nyerba'}
          className="block w-full rounded-lg border border-borde bg-superficie px-3 py-2 text-base outline-none focus:border-acento focus:ring-2 focus:ring-acento/30"
        />
      </label>

      {estado.error && (
        <p role="alert" className="text-sm text-error">
          {estado.error}
        </p>
      )}
      {estado.mensaje && (
        <p role="status" className="text-sm text-texto-suave">
          {estado.mensaje}
        </p>
      )}

      <button type="submit" disabled={pendiente} className="h-12 w-full rounded-lg bg-acento font-medium text-acento-texto disabled:opacity-50">
        {pendiente ? 'Guardando…' : 'Guardar intereses'}
      </button>
    </form>
  );
}
