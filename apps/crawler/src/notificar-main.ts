/**
 * `npm run notificar`: manda los avisos por Telegram. Corre en Actions despues de la corrida
 * (`corrida.yml`), con `if: always()`: aunque la corrida falle, lo pendiente sale.
 */
import { crearClienteServicio } from '@buscapromos/db/servicio';
import { notificar } from './notificar.js';

const token = process.env['TELEGRAM_BOT_TOKEN'];
const url = process.env['SUPABASE_URL'];
const clave = process.env['SUPABASE_SERVICE_ROLE_KEY'];
if (!token) {
  console.log('avisos: falta TELEGRAM_BOT_TOKEN, no se envia nada');
  process.exit(0);
}
if (!url || !clave) {
  console.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY. Ver docs/07-operacion.md.');
  process.exit(2);
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Telegram limita a ~1 mensaje por segundo por chat: se espera entre envios. */
async function enviar(chatId: string, texto: string): Promise<void> {
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: texto, parse_mode: 'HTML', link_preview_options: { is_disabled: true } }),
    signal: AbortSignal.timeout(15_000),
  });
  await esperar(1100);
  if (!r.ok) {
    // El cuerpo de error de Telegram no trae datos del usuario; el chat_id no se incluye.
    const cuerpo = (await r.json().catch(() => null)) as { description?: string } | null;
    throw new Error(`HTTP ${r.status}${cuerpo?.description ? ` ${cuerpo.description}` : ''}`);
  }
}

await notificar({
  db: crearClienteServicio(url, clave),
  enviar,
  ahora: Math.floor(Date.now() / 1000),
  log: (linea) => console.log(linea),
});
