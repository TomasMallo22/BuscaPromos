'use client';

import 'leaflet/dist/leaflet.css';
import type { Map as MapaLeaflet, Marker } from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import { PROVINCIAS, type Candidato } from '@/lib/geocodificar';

/** Buenos Aires, para arrancar. No es la ubicacion de nadie. */
const CENTRO_INICIAL: [number, number] = [-34.6037, -58.3816];

export type Punto = { lat: number; lng: number };

const claseInput =
  'block h-12 w-full rounded-lg border border-borde bg-superficie px-3 text-base outline-none focus:border-acento focus:ring-2 focus:ring-acento/30';

/**
 * Elegir una ubicacion de tres maneras (spec 003): escribiendo la direccion (Georef), con el GPS
 * del celular, o tocando el mapa. En las tres el pin queda arrastrable para ajustar.
 */
export function SelectorUbicacion({ inicial, onCambio }: { inicial: Punto | null; onCambio: (p: Punto) => void }) {
  const [aviso, setAviso] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const [provincia, setProvincia] = useState<string>(PROVINCIAS[0].id);
  const [candidatos, setCandidatos] = useState<Candidato[] | null>(null);
  const [buscando, setBuscando] = useState<'gps' | 'texto' | null>(null);
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaLeaflet | null>(null);
  const pin = useRef<Marker | null>(null);
  const moverPin = useRef<(p: Punto, zoom?: number) => void>(() => undefined);
  const avisar = useRef(onCambio);
  avisar.current = onCambio;

  // Leaflet toca `window`: se carga recien en el navegador.
  useEffect(() => {
    let cancelado = false;
    void import('leaflet').then((L) => {
      if (cancelado || !contenedor.current || mapa.current) return;
      const m = L.map(contenedor.current).setView(inicial ? [inicial.lat, inicial.lng] : CENTRO_INICIAL, inicial ? 17 : 12);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(m);
      // Un divIcon y no el icono por defecto: el default de Leaflet busca PNGs que el bundler no copia.
      const icono = L.divIcon({ className: '', html: '<div class="pin-direccion-forma"></div>', iconSize: [28, 28], iconAnchor: [14, 32] });
      moverPin.current = (p, zoom) => {
        if (!pin.current) {
          pin.current = L.marker([p.lat, p.lng], { draggable: true, icon: icono, keyboard: false }).addTo(m);
          pin.current.on('dragend', () => {
            const ll = pin.current!.getLatLng();
            avisar.current({ lat: ll.lat, lng: ll.lng });
          });
        } else {
          pin.current.setLatLng([p.lat, p.lng]);
        }
        if (zoom) m.setView([p.lat, p.lng], zoom);
        avisar.current(p);
      };
      if (inicial) moverPin.current(inicial);
      m.on('click', (e) => moverPin.current({ lat: e.latlng.lat, lng: e.latlng.lng }));
      mapa.current = m;
    });
    return () => {
      cancelado = true;
      mapa.current?.remove();
      mapa.current = null;
      pin.current = null;
    };
    // Sin dependencias a proposito: `inicial` solo cuenta al montar, despues manda el pin.
  }, []);

  async function buscarTexto() {
    if (texto.trim().length < 3) return;
    setBuscando('texto');
    setAviso(null);
    setCandidatos(null);
    try {
      const r = await fetch(`/api/geocodificar?q=${encodeURIComponent(texto)}&provincia=${provincia}`);
      const { candidatos: lista } = (await r.json()) as { candidatos?: Candidato[] };
      if (!r.ok || !lista) throw new Error();
      if (lista.length === 0) setAviso('No encontramos esa dirección. Probá con calle y altura, o marcala en el mapa.');
      else if (lista.length === 1) elegir(lista[0]!);
      else setCandidatos(lista);
    } catch {
      setAviso('No pudimos buscar la dirección ahora. Marcala en el mapa.');
    } finally {
      setBuscando(null);
    }
  }

  function elegir(c: Candidato) {
    setCandidatos(null);
    moverPin.current({ lat: c.lat, lng: c.lng }, 17);
    setAviso(`${c.nombre}. Si el pin no quedó justo en la puerta, arrastralo.`);
  }

  function usarMiUbicacion() {
    if (!('geolocation' in navigator)) {
      setAviso('Tu navegador no comparte la ubicación. Escribí la dirección o tocá el mapa.');
      return;
    }
    setBuscando('gps');
    setAviso(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBuscando(null);
        moverPin.current({ lat: pos.coords.latitude, lng: pos.coords.longitude }, 17);
        const precision = Math.round(pos.coords.accuracy);
        setAviso(
          precision > 100
            ? `El celular ubica con un margen de ${precision} m: revisá el pin y arrastralo, o escribí la dirección.`
            : 'Listo. Si el pin no quedó justo en tu casa, arrastralo.',
        );
      },
      (error) => {
        setBuscando(null);
        setAviso(
          error.code === error.PERMISSION_DENIED
            ? 'No nos diste permiso para ver tu ubicación. Escribí la dirección o tocá el mapa.'
            : 'No pudimos obtener tu ubicación. Escribí la dirección o tocá el mapa.',
        );
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <span className="text-sm font-medium">Buscar por dirección</span>
        <div className="flex gap-2">
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void buscarTexto();
              }
            }}
            placeholder="Ej.: Av. Cabildo 2000"
            autoComplete="street-address"
            aria-label="Dirección"
            className={claseInput}
          />
          <button
            type="button"
            onClick={() => void buscarTexto()}
            disabled={buscando !== null || texto.trim().length < 3}
            className="h-12 shrink-0 rounded-lg bg-acento px-4 font-medium text-acento-texto disabled:opacity-50"
          >
            {buscando === 'texto' ? '…' : 'Buscar'}
          </button>
        </div>
        <select value={provincia} onChange={(e) => setProvincia(e.target.value)} aria-label="Provincia" className={claseInput}>
          {PROVINCIAS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
        {candidatos && (
          <ul className="divide-y divide-borde rounded-lg border border-borde bg-superficie" aria-label="Resultados">
            {candidatos.map((c) => (
              <li key={`${c.lat},${c.lng}`}>
                <button type="button" onClick={() => elegir(c)} className="min-h-12 w-full px-3 py-2 text-left">
                  {c.nombre}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={usarMiUbicacion}
        disabled={buscando !== null}
        className="h-12 w-full rounded-lg border border-borde bg-superficie font-medium disabled:opacity-60"
      >
        {buscando === 'gps' ? 'Buscando tu ubicación…' : '📍 Usar mi ubicación'}
      </button>

      <div
        ref={contenedor}
        className="h-72 w-full overflow-hidden rounded-xl border border-borde"
        role="application"
        aria-label="Mapa: tocá para marcar la dirección"
      />
      <p className="text-sm text-texto-suave" aria-live="polite">
        {aviso ?? 'También podés tocar el mapa donde está la dirección.'}
      </p>
    </div>
  );
}
