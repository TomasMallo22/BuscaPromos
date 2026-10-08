import {
  descuentosAnunciados,
  hallazgosVigentes,
  misDirecciones,
  misTiendas,
  type DireccionDelUsuario,
} from '@buscapromos/db';
import { PARAMETROS } from '@buscapromos/core';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { AutoRefresco } from '@/componentes/auto-refresco';
import { TarjetaDescuento, TarjetaHallazgo } from '@/componentes/tarjetas';
import { diaDeHistorial, primeroPorProducto } from '@/lib/formato';
import { crearClienteServidor } from '@/lib/supabase/servidor';

/**
 * El feed. Los estados vacios son features (docs/14): sin ellos el dueño concluye que no
 * funciona justo cuando funciona como se diseño. Todo lo que muestra viene calculado de la
 * base (regla de oro 11): la pagina ordena y formatea, no detecta.
 */
export default async function PaginaFeed() {
  const supabase = await crearClienteServidor();
  const [direcciones, tiendas] = await Promise.all([misDirecciones(supabase), misTiendas(supabase)]);

  if (direcciones.length === 0) {
    return (
      <Aviso titulo="Cargá una dirección para empezar">
        <p>Las ofertas dependen de qué Rappi Turbo te llega, y eso depende de dónde estás.</p>
        <Link
          href="/direcciones/nueva"
          className="mt-4 flex h-12 w-full items-center justify-center rounded-lg bg-acento font-medium text-acento-texto"
        >
          Cargar mi dirección
        </Link>
      </Aviso>
    );
  }

  const buscandoTienda = direcciones.filter((d) => d.estado === 'buscando_tienda');
  const sinCobertura = direcciones.filter((d) => d.estado === 'sin_cobertura');
  const primeraVez = tiendas.filter((t) => !t.primeraCorridaOkAt);
  const recorridas = tiendas.filter((t) => t.primeraCorridaOkAt);
  const esperando = buscandoTienda.length > 0 || primeraVez.length > 0;

  const [hallazgos, descuentos] =
    recorridas.length > 0 ? await Promise.all([hallazgosVigentes(supabase), descuentosAnunciados(supabase)]) : [[], []];
  const porProducto = primeroPorProducto(hallazgos);

  // El dia del arranque ciego cuenta desde la tienda mas vieja: con una sola, es esa.
  const primera = recorridas
    .map((t) => t.primeraCorridaOkAt!)
    .sort()
    .at(0);
  const dia = primera ? diaDeHistorial(primera, Date.now()) : null;
  const diasNecesarios = PARAMETROS.ofertaMinHistorialDias;

  return (
    <div className="space-y-6">
      {esperando && <AutoRefresco cadaSegundos={20} />}

      {buscandoTienda.length > 0 && (
        <Aviso titulo={`Buscando tus tiendas de Rappi para ${nombres(buscandoTienda)}`}>
          <p>El buscador arranca en un minuto: busca Rappi Turbo y los supermercados de Rappi que llegan a esa dirección.</p>
        </Aviso>
      )}

      {sinCobertura.length > 0 && (
        <Aviso titulo={`Rappi no llega a ${nombres(sinCobertura)}`}>
          <p>Lo intentamos durante un día y no apareció ninguna de las tiendas que seguimos para esa dirección.</p>
        </Aviso>
      )}

      {primeraVez.length > 0 && buscandoTienda.length === 0 && (
        <Aviso titulo="Buscando por primera vez">
          <p>
            Estamos recorriendo {primeraVez.map((t) => t.nombre ?? t.tipo).join(', ')}. La primera vez tarda: los
            supermercados tienen miles de productos. Esta página se actualiza sola.
          </p>
        </Aviso>
      )}

      {dia !== null && dia <= diasNecesarios && (
        <div className="rounded-xl border border-neutro/40 bg-superficie p-4 text-sm">
          <p className="font-medium text-neutro">
            Juntando historial, día {dia} de {diasNecesarios}
          </p>
          <p className="mt-1 text-texto-suave">
            Para saber si un precio es de verdad más bajo que el de siempre necesitamos verlo unos días. Mientras tanto
            detectamos errores de precio, productos rarísimamente baratos para su góndola, y lo que está a menos de la
            mitad que en tus otras tiendas.
          </p>
        </div>
      )}

      {recorridas.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="font-semibold">Detectado por BuscaPromos</h2>
            <p className="mt-1 text-sm text-texto-suave">En {recorridas.map((t) => t.nombre ?? t.tipo).join(', ')}.</p>
          </div>
          {porProducto.length > 0 ? (
            porProducto.map((h) => <TarjetaHallazgo key={h.id} h={h} />)
          ) : (
            <p className="rounded-xl border border-borde bg-superficie p-4 text-texto-suave">
              Nada raro por ahora. Es lo normal: avisamos cuando algo está muy por debajo de su precio de siempre.
            </p>
          )}
        </section>
      )}

      {descuentos.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="font-semibold">Descuentos que anuncia Rappi</h2>
            <p className="mt-1 text-sm text-texto-suave">
              Calculados contra el precio tachado, que muchas veces está inflado. Todavía no podemos confirmar cuáles son
              reales: lo vamos a saber cuando tengamos historial.
            </p>
          </div>
          {descuentos.map((d) => (
            <TarjetaDescuento key={d.productoId} d={d} />
          ))}
        </section>
      )}
    </div>
  );
}

const nombres = (ds: readonly DireccionDelUsuario[]) => ds.map((d) => `"${d.etiqueta}"`).join(' y ');

function Aviso({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-borde bg-superficie p-5">
      <h1 className="text-lg font-semibold">{titulo}</h1>
      <div className="mt-2 text-texto-suave">{children}</div>
    </section>
  );
}
