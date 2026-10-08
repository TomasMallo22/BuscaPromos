import { obtenerPerfil } from '@buscapromos/db';
import { redirect } from 'next/navigation';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { cerrarSesion } from './acciones';

/**
 * Por ahora solo lectura. Editar reglas, ratio, horario silencioso y canales llega con la
 * spec 001/002; los valores que se muestran son los defaults que pone la migracion 0007.
 */
export default async function PaginaAjustes() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const perfil = await obtenerPerfil(supabase);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Ajustes</h1>

      <section className="divide-y divide-borde rounded-xl border border-borde bg-superficie">
        <Fila etiqueta="Cuenta" valor={user.email ?? 'sin mail'} />
        {perfil ? (
          <>
            <Fila
              etiqueta="Horario silencioso"
              valor={`de ${perfil.hora_silencio_desde} a ${perfil.hora_silencio_hasta} h`}
            />
            <Fila etiqueta="Máximo de avisos" valor={`${perfil.max_alertas_hora} por hora`} />
          </>
        ) : (
          <Fila etiqueta="Preferencias" valor="Tu perfil todavía no se creó" />
        )}
      </section>

      <p className="text-sm text-texto-suave">
        En el horario silencioso los avisos no se pierden: quedan acá en la web. Para cambiar estos
        valores todavía no hay pantalla.
      </p>

      <form action={cerrarSesion}>
        <button
          type="submit"
          className="h-12 w-full rounded-lg border border-borde bg-superficie font-medium text-texto"
        >
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-4 px-4 py-3">
      <span className="text-texto-suave">{etiqueta}</span>
      <span className="text-right font-medium break-all">{valor}</span>
    </div>
  );
}
