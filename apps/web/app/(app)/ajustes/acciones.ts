'use server';

import { crearVinculoTelegram, desconectarTelegram, guardarPreferenciasAvisos } from '@buscapromos/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { categoriasValidas, parsearTerminos } from '@/lib/avisos';
import { usuarioBot } from '@/lib/telegram';
import { crearClienteServidor } from '@/lib/supabase/servidor';

export async function cerrarSesion(): Promise<void> {
  const supabase = await crearClienteServidor();
  await supabase.auth.signOut();
  redirect('/login');
}

/**
 * Crea el vinculo (lo hace la base: token de un uso, 15 minutos) y abre el bot con
 * `/start <token>`. En el celular, el link abre la app de Telegram.
 */
export async function conectarTelegram(): Promise<void> {
  const bot = usuarioBot(process.env.NEXT_PUBLICO_TELEGRAM_BOT);
  if (!bot) redirect('/ajustes?telegram=sin-bot');
  const supabase = await crearClienteServidor();
  const token = await crearVinculoTelegram(supabase);
  redirect(`https://t.me/${encodeURIComponent(bot)}?start=${token}`);
}

export async function desvincularTelegram(): Promise<void> {
  const supabase = await crearClienteServidor();
  await desconectarTelegram(supabase);
  revalidatePath('/ajustes');
}

export type EstadoAvisos = { mensaje: string | null; error: string | null };

export async function guardarAvisos(_previo: EstadoAvisos, datos: FormData): Promise<EstadoAvisos> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const categorias = categoriasValidas(datos.getAll('categorias').map(String));
  const terminos = parsearTerminos(String(datos.get('terminos') ?? ''));
  try {
    await guardarPreferenciasAvisos(supabase, user.id, { categorias, terminos });
  } catch {
    return { mensaje: null, error: 'No pudimos guardar. Probá de nuevo.' };
  }
  revalidatePath('/ajustes');
  return {
    mensaje:
      categorias.length + terminos.length === 0
        ? 'Guardado. Sin categorías ni productos no te va a llegar ningún aviso.'
        : 'Guardado.',
    error: null,
  };
}
