'use client';

import 'leaflet/dist/leaflet.css';
import type { Map as MapaLeaflet, Marker } from 'leaflet';
import { useActionState, useEffect, useRef, useState } from 'react';
import { guardarDireccion, type EstadoDireccion } from './acciones';

/** Buenos Aires, para arrancar. No es la ubicacion de nadie. */
const CENTRO_INICIAL: [number, number] = [-34.6037, -58.3816];

type Punto = { lat: number; lng: number };

export function FormularioDireccion() {
  const [estado, accion, pendiente] = useActionState<EstadoDireccion, FormData>(guardarDireccion, { error: null });
  const [punto, setPunto] = useState<Punto | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaLeaflet | null>(null);
  const pin = useRef<Marker | null>(null);
  const moverPin = useRef<(p: Punto, zoom?: number) => void>(() => undefined);

  // Leaflet toca `window`: se carga recien en el navegador.
  useEffect(() => {
    let cancelado = false;
    void import('leaflet').then((L) => {
      if (cancelado || !contenedor.current || mapa.current) return;
      const m = L.map(contenedor.current, { zoomControl: true }).setView(CENTRO_INICIAL, 12);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(m);
      // Un divIcon y no el icono por defecto: el default de Leaflet busca PNGs que el bundler no copia.
      const icono = L.divIcon({
        className: '',
        html: '<div class="pin-direccion-forma"></div>',
        iconSize: [28, 28],
        iconAnchor: [14, 32],
      });
      moverPin.current = (p, zoom) => {
        if (!pin.current) {
          pin.current = L.marker([p.lat, p.lng], { draggable: true, icon: icono, keyboard: false }).addTo(m);
          pin.current.on('dragend', () => {
            const ll = pin.current!.getLatLng();
            setPunto({ lat: ll.lat, lng: ll.lng });
          });
        } else {
          pin.current.setLatLng([p.lat, p.lng]);
        }
        if (zoom) m.setView([p.lat, p.lng], zoom);
        setPunto(p);
      };
      m.on('click', (e) => moverPin.current({ lat: e.latlng.lat, lng: e.latlng.lng }));
      mapa.current = m;
    });
    return () => {
      cancelado = true;
      mapa.current?.remove();
      mapa.current = null;
      pin.current = null;
    };
  }, []);

  function usarMiUbicacion() {
    if (!('geolocation' in navigator)) {
      setAviso('Tu navegador no comparte la ubicación. Tocá el mapa para marcarla.');
      return;
    }
    setBuscando(true);
    setAviso(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBuscando(false);
        moverPin.current({ lat: pos.coords.latitude, lng: pos.coords.longitude }, 17);
        setAviso('Listo. Si el pin no quedó justo en tu casa, arrastralo.');
      },
      (error) => {
        setBuscando(false);
        setAviso(
          error.code === error.PERMISSION_DENIED
            ? 'No nos diste permiso para ver tu ubicación. Tocá el mapa para marcarla a mano.'
            : 'No pudimos obtener tu ubicación. Tocá el mapa para marcarla a mano.',
        );
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  return (
    <form action={accion} className="space-y-5">
      <button
        type="button"
        onClick={usarMiUbicacion}
        disabled={buscando}
        className="h-12 w-full rounded-lg bg-acento font-medium text-acento-texto disabled:opacity-60"
      >
        {buscando ? 'Buscando tu ubicación…' : '📍 Usar mi ubicación'}
      </button>

      <div>
        <div
          ref={contenedor}
          className="h-72 w-full overflow-hidden rounded-xl border border-borde"
          role="application"
          aria-label="Mapa: tocá para marcar la dirección"
        />
        <p className="mt-2 text-sm text-texto-suave" aria-live="polite">
          {aviso ?? (punto ? 'Pin marcado. Podés arrastrarlo para ajustarlo.' : 'O tocá el mapa donde está la dirección.')}
        </p>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-medium">Nombre</span>
        <input
          name="etiqueta"
          defaultValue="Casa"
          maxLength={40}
          required
          className="block h-12 w-full rounded-lg border border-borde bg-superficie px-3 text-base outline-none focus:border-acento focus:ring-2 focus:ring-acento/30"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium">
          Referencia <span className="font-normal text-texto-suave">(opcional, solo la ves vos)</span>
        </span>
        <input
          name="referencia"
          maxLength={120}
          placeholder="Ej.: Av. Corrientes 1234"
          className="block h-12 w-full rounded-lg border border-borde bg-superficie px-3 text-base outline-none focus:border-acento focus:ring-2 focus:ring-acento/30"
        />
      </label>

      <input type="hidden" name="lat" value={punto?.lat ?? ''} />
      <input type="hidden" name="lng" value={punto?.lng ?? ''} />

      {estado.error && (
        <p role="alert" className="text-sm text-error">
          {estado.error}
        </p>
      )}

      <button
        type="submit"
        disabled={!punto || pendiente}
        className="h-12 w-full rounded-lg border border-borde bg-superficie font-medium text-texto disabled:opacity-50"
      >
        {pendiente ? 'Guardando…' : 'Guardar y buscar ofertas'}
      </button>

      <p className="text-xs text-texto-suave">
        Tu dirección la ves solo vos. Se usa para saber qué tienda de Rappi te corresponde.
      </p>
    </form>
  );
}
