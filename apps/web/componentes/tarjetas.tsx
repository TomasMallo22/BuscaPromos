import { REGISTRY } from '@buscapromos/core';
import type { DescuentoAnunciado, HallazgoEnFeed } from '@buscapromos/db';
import { urlProductoRappi } from '@buscapromos/providers/rappi-url';
import type { ReactNode } from 'react';
import { pesos, porcentajeMenos } from '@/lib/formato';

/**
 * Las cards del feed. Tres datos y no mas (docs/14): nombre + presentacion, precio actual, y
 * cuanto bajo, con el precio de referencia SIEMPRE al lado. La imagen es decorativa.
 */
function Tarjeta(props: {
  nombre: string;
  presentacion: string | null;
  imagenUrl: string | null;
  href: string;
  precio: number;
  linea: ReactNode;
  insignias: ReactNode;
  tienda: string | null;
}) {
  return (
    <a
      href={props.href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-3 rounded-xl border border-borde bg-superficie p-3 active:opacity-80"
    >
      {/* Decorativa (alt vacio): si no carga, la card sigue sirviendo. */}
      {props.imagenUrl ? (
        <img src={props.imagenUrl} alt="" loading="lazy" className="h-16 w-16 shrink-0 rounded-lg bg-fondo object-contain" />
      ) : (
        <div className="h-16 w-16 shrink-0 rounded-lg bg-fondo" aria-hidden />
      )}
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 leading-snug font-medium">{props.nombre}</p>
        <p className="text-sm text-texto-suave">
          {[props.presentacion, props.tienda && `en ${props.tienda}`].filter(Boolean).join(' · ')}
        </p>
        <p className="mt-1">
          <span className="text-lg font-semibold">{pesos(props.precio)}</span>{' '}
          <span className="text-sm text-texto-suave">{props.linea}</span>
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">{props.insignias}</div>
      </div>
    </a>
  );
}

/** El color nunca va solo: cada insignia lleva texto (docs/14, accesibilidad). */
function Insignia({ tono, children }: { tono: 'alerta' | 'real' | 'neutro' | 'atenuado'; children: ReactNode }) {
  const clases = {
    alerta: 'border-alerta-fuerte text-alerta-fuerte',
    real: 'border-oferta-real text-oferta-real',
    neutro: 'border-neutro text-neutro',
    atenuado: 'border-atenuado text-atenuado',
  }[tono];
  return <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${clases}`}>{children}</span>;
}

const ESTADO_OFERTA = {
  real: { texto: 'Oferta real según su historial', tono: 'real' },
  inflado: { texto: 'Tachado inflado', tono: 'atenuado' },
  sin_historial: { texto: 'Sin historial todavía', tono: 'neutro' },
} as const;

export function TarjetaHallazgo({ h }: { h: HallazgoEnFeed }) {
  const regla = REGISTRY[h.regla];
  const estado = h.estadoOferta ? ESTADO_OFERTA[h.estadoOferta] : null;
  return (
    <Tarjeta
      nombre={h.nombre}
      presentacion={h.presentacion}
      imagenUrl={h.imagenUrl}
      href={urlProductoRappi(h.nombre, h.tienda.idExterno, h.tienda.tipo)}
      tienda={h.tienda.nombre}
      precio={h.precio}
      linea={
        h.precioReferencia && h.ratio !== null
          ? `antes ${pesos(h.precioReferencia)} · ${porcentajeMenos(h.ratio)} menos`
          : 'sin precio de referencia'
      }
      insignias={
        <>
          <Insignia tono={regla.clave === REGISTRY.gran_descuento.clave ? 'real' : 'alerta'}>
            {regla.emoji} {regla.titulo}
          </Insignia>
          {estado && <Insignia tono={estado.tono}>{estado.texto}</Insignia>}
        </>
      }
    />
  );
}

export function TarjetaDescuento({ d }: { d: DescuentoAnunciado }) {
  return (
    <Tarjeta
      nombre={d.nombre}
      presentacion={d.presentacion}
      imagenUrl={d.imagenUrl}
      href={urlProductoRappi(d.nombre, d.tienda.idExterno, d.tienda.tipo)}
      tienda={d.tienda.nombre}
      precio={d.precio}
      linea={`tachado ${pesos(d.precioLista)} · ${porcentajeMenos(d.ratioLista)} menos`}
      insignias={<Insignia tono="neutro">Según Rappi · sin verificar</Insignia>}
    />
  );
}
