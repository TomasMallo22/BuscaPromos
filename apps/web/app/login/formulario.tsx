'use client';

import { useActionState } from 'react';
import type { EstadoLogin } from '@/lib/auth';
import { pedirLink } from './acciones';

export function FormularioLogin({ errorInicial }: { errorInicial: string | null }) {
  const inicial: EstadoLogin = errorInicial ? { tipo: 'error', mensaje: errorInicial } : { tipo: 'inicial' };
  const [estado, accion, pendiente] = useActionState(pedirLink, inicial);

  if (estado.tipo === 'enviado') {
    return (
      <div className="space-y-3" role="status">
        <p className="text-lg font-medium">Revisá tu mail</p>
        <p className="text-texto-suave">
          Te mandamos un link a <span className="font-medium text-texto">{estado.email}</span>. Lo
          podés abrir desde este celular o desde cualquier otro. Vence en una hora.
        </p>
        <p className="text-sm text-texto-suave">
          ¿No llegó? Fijate en spam, o{' '}
          <a href="/login" className="font-medium text-acento underline underline-offset-2">
            pedilo de nuevo
          </a>{' '}
          en un minuto.
        </p>
      </div>
    );
  }

  return (
    <form action={accion} className="space-y-4" noValidate>
      <label className="block space-y-2">
        <span className="text-sm font-medium">Tu mail</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="vos@gmail.com"
          aria-invalid={estado.tipo === 'error'}
          aria-describedby={estado.tipo === 'error' ? 'error-login' : undefined}
          className="block h-12 w-full rounded-lg border border-borde bg-superficie px-3 text-base outline-none focus:border-acento focus:ring-2 focus:ring-acento/30"
        />
      </label>

      {estado.tipo === 'error' && (
        <p id="error-login" role="alert" className="text-sm text-error">
          {estado.mensaje}
        </p>
      )}

      <button
        type="submit"
        disabled={pendiente}
        className="h-12 w-full rounded-lg bg-acento font-medium text-acento-texto transition-opacity disabled:opacity-60"
      >
        {pendiente ? 'Mandando…' : 'Mandame el link'}
      </button>
    </form>
  );
}
