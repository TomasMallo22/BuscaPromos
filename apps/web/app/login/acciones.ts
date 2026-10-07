'use server';

import { headers } from 'next/headers';
import { emailValido, mensajeErrorLogin, type EstadoLogin } from '@/lib/auth';
import { crearClienteServidor } from '@/lib/supabase/servidor';

export async function pedirLink(_previo: EstadoLogin, datos: FormData): Promise<EstadoLogin> {
  const email = String(datos.get('email') ?? '')
    .trim()
    .toLowerCase();
  if (!emailValido(email)) return { tipo: 'error', mensaje: 'Revisá el mail: no parece válido.' };

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // Registro solo por invitacion (spec 001, E15): un mail que no existe no crea cuenta.
      // La barrera de verdad es "Allow new users to sign up" apagado en el panel de Supabase;
      // esto es para que el mensaje sea claro.
      shouldCreateUser: false,
      // El mismo origen desde el que se pidio: localhost, preview o produccion. Supabase lo
      // valida contra su lista de Redirect URLs, asi que un Origin trucho no sirve de nada.
      emailRedirectTo: `${await origen()}/auth/confirm`,
    },
  });

  if (error) return { tipo: 'error', mensaje: mensajeErrorLogin(error) };
  return { tipo: 'enviado', email };
}

async function origen(): Promise<string> {
  const h = await headers();
  const origin = h.get('origin');
  if (origin) return origin;
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const protocolo = h.get('x-forwarded-proto') ?? 'https';
  return `${protocolo}://${host}`;
}
