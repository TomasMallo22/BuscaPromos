import { obtenerPerfil, telegramConectado } from '@buscapromos/db';
import { redirect } from 'next/navigation';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { cerrarSesion, conectarTelegram, desvincularTelegram } from './acciones';
import { FormularioAvisos } from './formulario-avisos';

/**
 * Ajustes: los avisos por Telegram (spec 004) y la cuenta. El horario silencioso y el tope por
 * hora se muestran pero no se editan todavia (quedaron afuera de la 004).
 */
export default async function PaginaAjustes({ searchParams }: { searchParams: Promise<{ telegram?: string }> }) {
  const { telegram } = await searchParams;
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const [perfil, conectado] = await Promise.all([obtenerPerfil(supabase), telegramConectado(supabase)]);
  const categorias = perfil?.avisos_categorias ?? [];
  const terminos = perfil?.avisos_terminos ?? [];
  const sinPreferencias = categorias.length === 0 && terminos.length === 0;

  return (
    <div className="space-y-8">
      <h1 className="text-lg font-semibold">Ajustes</h1>

      <section className="space-y-4">
        <h2 className="font-semibold">Avisos por Telegram</h2>

        <div className="rounded-xl border border-borde bg-superficie p-4">
          {conectado ? (
            <div className="flex items-center justify-between gap-4">
              <p>
                <span className="font-medium text-oferta-real">✓ Conectado</span>
                <span className="block text-sm text-texto-suave">
                  {sinPreferencias ? 'Elegí abajo qué te interesa: sin eso no te llega nada.' : 'Te llegan avisos de lo que elegiste abajo.'}
                </span>
              </p>
              <form action={desvincularTelegram}>
                <button type="submit" className="h-11 shrink-0 rounded-lg border border-borde px-3 text-sm">
                  Desconectar
                </button>
              </form>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-texto-suave">
                Tocá el botón: se abre Telegram con el bot de BuscaPromos. Tocá <b>Iniciar</b> y listo. El link sirve 15 minutos.
              </p>
              {telegram === 'sin-bot' && (
                <p role="alert" className="text-sm text-error">
                  El bot todavía no está configurado en la web (falta NEXT_PUBLIC_TELEGRAM_BOT).
                </p>
              )}
              <form action={conectarTelegram}>
                <button type="submit" className="h-12 w-full rounded-lg bg-acento font-medium text-acento-texto">
                  Conectar Telegram
                </button>
              </form>
            </div>
          )}
        </div>

        <FormularioAvisos categorias={categorias} terminos={terminos} />

        {perfil && (
          <p className="text-sm text-texto-suave">
            No te escribimos de {perfil.hora_silencio_desde} a {perfil.hora_silencio_hasta} h (lo de esas horas sale después),
            y como máximo {perfil.max_alertas_hora} avisos por hora: primero los de más descuento.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Cuenta</h2>
        <div className="flex min-h-12 items-center justify-between gap-4 rounded-xl border border-borde bg-superficie px-4 py-3">
          <span className="text-texto-suave">Mail</span>
          <span className="text-right font-medium break-all">{user.email ?? 'sin mail'}</span>
        </div>
        <form action={cerrarSesion}>
          <button type="submit" className="h-12 w-full rounded-lg border border-borde bg-superficie font-medium text-texto">
            Cerrar sesión
          </button>
        </form>
      </section>
    </div>
  );
}
