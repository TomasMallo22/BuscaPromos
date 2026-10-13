/**
 * Lo que el webhook de Telegram valida antes de hacer nada (spec 004). Puro, para testearlo.
 */
import { timingSafeEqual } from 'node:crypto';

/**
 * El header `X-Telegram-Bot-Api-Secret-Token` contra el secreto que se registro con
 * `setWebhook`. Sin esto, cualquiera que descubra la URL inyecta mensajes (E11). Comparacion de
 * tiempo constante, y sin secreto configurado no pasa nadie.
 */
export function secretoValido(recibido: string | null, esperado: string | undefined): boolean {
  if (!esperado || !recibido) return false;
  const a = Buffer.from(recibido);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** El token del deep link `t.me/<bot>?start=<token>`: Telegram lo manda como "/start <token>". */
export function tokenDeStart(texto: string | undefined): string | null {
  return /^\/start ([0-9a-f]{32})$/.exec(texto?.trim() ?? '')?.[1] ?? null;
}
