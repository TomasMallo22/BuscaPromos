/**
 * La logica pura del login: sin Next, sin Supabase, sin cookies. Vive aparte para poder
 * testearla, porque cada funcion de aca es una puerta de entrada (open redirect, enumeracion
 * de tipos de token, una clave secreta pegada donde iba la publica).
 */

import type { EmailOtpType } from '@supabase/supabase-js';

/** A donde va el usuario despues de entrar si nadie dijo otra cosa. */
export const DESTINO_POR_DEFECTO = '/feed';

/**
 * Solo rutas internas. Un `next=https://otro.com` en el link del mail convierte nuestro login
 * en un trampolin de phishing; `//otro.com` y `/\otro.com` son la misma trampa disfrazada.
 */
export function destinoSeguro(destino: string | null): string {
  if (!destino || !destino.startsWith('/')) return DESTINO_POR_DEFECTO;
  if (destino.startsWith('//') || destino.startsWith('/\\')) return DESTINO_POR_DEFECTO;
  return destino;
}

/**
 * Los tipos de token que `/auth/confirm` acepta. `email` es el magic link, `invite` la
 * invitacion que manda el dueño desde el panel. `signup` no: el registro es solo por invitacion
 * (spec 001, E15). `recovery` tampoco: no hay contraseñas.
 */
const TIPOS_OTP = ['email', 'magiclink', 'invite'] as const satisfies readonly EmailOtpType[];
type TipoOtp = (typeof TIPOS_OTP)[number];

export function tipoOtp(valor: string | null): TipoOtp | null {
  return TIPOS_OTP.find((tipo) => tipo === valor) ?? null;
}

/** Las rutas que se ven sin sesion. Todo lo demas redirige a `/login`. */
export function esRutaPublica(ruta: string): boolean {
  return ruta === '/login' || ruta.startsWith('/auth/');
}

/** Chequeo de forma, no de existencia: el que decide si el mail sirve es Supabase. */
export function emailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export type EstadoLogin =
  | { tipo: 'inicial' }
  | { tipo: 'enviado'; email: string }
  | { tipo: 'error'; mensaje: string };

export const MENSAJE_LINK_VENCIDO = 'El link venció o ya se usó. Pedí uno nuevo.';

/**
 * Traduce el error de Supabase Auth a algo que una persona entiende. Nunca devuelve el
 * mensaje original: un stack trace en pantalla es el E3 de la spec 000.
 */
export function mensajeErrorLogin(error: {
  code?: string | undefined;
  status?: number | undefined;
  message: string;
}): string {
  // Con `shouldCreateUser: false`, un mail que no existe en auth.users rebota asi.
  if (error.code === 'otp_disabled' || /signups not allowed/i.test(error.message)) {
    return 'Ese mail no tiene invitación. Pedile una a quien te pasó el link.';
  }
  if (error.code === 'over_email_send_rate_limit' || error.status === 429) {
    return 'Pediste varios links seguidos. Esperá un minuto y probá de nuevo.';
  }
  return 'No pudimos mandar el link. Probá de nuevo en un rato.';
}

/**
 * ¿La clave que llego como "publica" es en realidad la secreta? Es el bug de una linea de
 * docs/10: pegar la clave equivocada en la variable de Vercel la manda al navegador, y esa
 * clave saltea RLS. Las tres defensas estaticas (lint, grep, el archivo aparte en
 * `packages/db`) no ven el valor de una variable de entorno; esta si.
 */
export function esClaveSecreta(clave: string): boolean {
  if (clave.startsWith('sb_secret_')) return true;
  const payload = clave.split('.')[1];
  if (!payload) return false;
  try {
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as { role?: unknown };
    return json.role === 'service_role';
  } catch {
    return false;
  }
}
