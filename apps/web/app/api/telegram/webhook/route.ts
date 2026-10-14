import { createClient } from '@supabase/supabase-js';
import { vincularTelegram, type Database } from '@buscapromos/db';
import { NextResponse, type NextRequest } from 'next/server';
import { entornoSupabase } from '@/lib/supabase/entorno';
import { secretoValido, tokenDeStart } from '@/lib/telegram';

/**
 * El webhook del bot (spec 004). Telegram lo llama sin sesion de usuario, asi que:
 *
 * - valida `X-Telegram-Bot-Api-Secret-Token` (E11): sin el secreto correcto, 401 y nada mas;
 * - vincula con la clave PUBLICA llamando a `vincular_telegram`, una funcion de la base que solo
 *   acepta un token de un uso y 15 minutos. Nunca la clave secreta (regla CLAUDE.md).
 *
 * El chat_id y el texto no se loguean (regla de oro 14). A Telegram siempre se le contesta 200
 * si el secreto es valido: si no, reintenta el mismo update una y otra vez.
 */
export async function POST(request: NextRequest) {
  if (!secretoValido(request.headers.get('x-telegram-bot-api-secret-token'), process.env.TELEGRAM_WEBHOOK_SECRET)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const update = (await request.json().catch(() => null)) as {
    message?: { chat?: { id?: number; type?: string }; text?: string };
  } | null;
  const chat = update?.message?.chat;
  if (!chat?.id) return NextResponse.json({ ok: true });

  let respuesta =
    'Hola. Este bot manda los avisos de BuscaPromos. Para conectarlo, entrá a la web → Ajustes → "Conectar Telegram".';
  const token = tokenDeStart(update?.message?.text);
  if (token) {
    if (chat.type !== 'private') {
      respuesta = 'Conectalo desde un chat privado con el bot, no desde un grupo.';
    } else {
      const { url, clavePublica } = entornoSupabase();
      const anonimo = createClient<Database>(url, clavePublica, { auth: { persistSession: false, autoRefreshToken: false } });
      const ok = await vincularTelegram(anonimo, token, String(chat.id));
      respuesta = ok
        ? '¡Listo! Ya estás conectado. Elegí en la web (Ajustes) qué categorías y productos te interesan.'
        : 'Ese link venció o ya se usó. Generá uno nuevo en la web: Ajustes → "Conectar Telegram".';
    }
  }

  await responder(String(chat.id), respuesta);
  return NextResponse.json({ ok: true });
}

async function responder(chatId: string, texto: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: texto }),
    signal: AbortSignal.timeout(8000),
  }).catch(() => undefined);
}
