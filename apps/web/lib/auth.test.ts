import { describe, expect, it } from 'vitest';
import {
  destinoSeguro,
  emailValido,
  esClaveSecreta,
  esRutaPublica,
  mensajeErrorLogin,
  PREFIJO_CLAVE_SECRETA,
  tipoOtp,
} from './auth';

describe('destinoSeguro', () => {
  it('acepta una ruta interna', () => {
    expect(destinoSeguro('/ajustes')).toBe('/ajustes');
  });

  it('sin destino va al feed', () => {
    expect(destinoSeguro(null)).toBe('/feed');
    expect(destinoSeguro('')).toBe('/feed');
  });

  // Open redirect: un link de login que termina en otro dominio es phishing con nuestro nombre.
  it.each(['https://malo.com', '//malo.com', '/\\malo.com', 'malo.com', 'javascript:alert(1)'])(
    'rechaza %s',
    (destino) => {
      expect(destinoSeguro(destino)).toBe('/feed');
    },
  );
});

describe('tipoOtp', () => {
  it.each(['email', 'magiclink', 'invite'] as const)('acepta %s', (tipo) => {
    expect(tipoOtp(tipo)).toBe(tipo);
  });

  it.each([null, '', 'recovery', 'signup', 'cualquiera'])('rechaza %s', (tipo) => {
    expect(tipoOtp(tipo)).toBeNull();
  });
});

describe('esRutaPublica', () => {
  it.each(['/login', '/auth/confirm'])('%s es publica', (ruta) => {
    expect(esRutaPublica(ruta)).toBe(true);
  });

  it.each(['/', '/feed', '/ajustes', '/loginx', '/authx'])('%s pide sesion', (ruta) => {
    expect(esRutaPublica(ruta)).toBe(false);
  });
});

describe('emailValido', () => {
  it.each(['yo@gmail.com', 'a.b+promos@httpsolutions.dev'])('acepta %s', (email) => {
    expect(emailValido(email)).toBe(true);
  });

  it.each(['', 'yo', 'yo@', '@gmail.com', 'yo@gmail', 'y o@gmail.com'])('rechaza %s', (email) => {
    expect(emailValido(email)).toBe(false);
  });
});

describe('mensajeErrorLogin', () => {
  // E15 de la spec 001: un mail sin invitacion rebota con un mensaje claro.
  it('mail sin invitacion', () => {
    expect(mensajeErrorLogin({ code: 'otp_disabled', message: 'Signups not allowed for otp' })).toMatch(
      /invitaci/i,
    );
  });

  it('mail sin invitacion, reconocido por el mensaje si no viene el codigo', () => {
    expect(mensajeErrorLogin({ message: 'Signups not allowed for otp' })).toMatch(/invitaci/i);
  });

  it('demasiados pedidos seguidos', () => {
    expect(mensajeErrorLogin({ code: 'over_email_send_rate_limit', message: 'x' })).toMatch(/esper/i);
    expect(mensajeErrorLogin({ status: 429, message: 'x' })).toMatch(/esper/i);
  });

  it('cualquier otro error no muestra el detalle tecnico', () => {
    const mensaje = mensajeErrorLogin({ message: 'AuthApiError: stack trace interno' });
    expect(mensaje).not.toMatch(/AuthApiError/);
    expect(mensaje.length).toBeGreaterThan(0);
  });
});

// Sin literales con forma de clave: los escaneres de secretos (GitGuardian) los marcan aunque
// sean de juguete, y un falso positivo repetido entrena a ignorar el verdadero.
describe('esClaveSecreta', () => {
  const jwt = (payload: object) =>
    ['e30', Buffer.from(JSON.stringify(payload)).toString('base64url'), 'firma'].join('.');

  it('la clave publica nueva no es secreta', () => {
    expect(esClaveSecreta('sb_publishable_de-prueba')).toBe(false);
  });

  it('la clave secreta nueva si', () => {
    expect(esClaveSecreta(`${PREFIJO_CLAVE_SECRETA}de-prueba`)).toBe(true);
  });

  it('el JWT legacy con rol anon no es secreto', () => {
    expect(esClaveSecreta(jwt({ role: 'anon' }))).toBe(false);
  });

  it('el JWT legacy con rol service_role si', () => {
    expect(esClaveSecreta(jwt({ role: 'service_role' }))).toBe(true);
  });

  it('basura no explota', () => {
    expect(esClaveSecreta('a.b.c')).toBe(false);
    expect(esClaveSecreta('')).toBe(false);
  });
});
