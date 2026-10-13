/**
 * Direccion escrita -> coordenadas, con la API Georef del Estado (datos.gob.ar): gratuita, sin
 * clave, pensada para direcciones argentinas (spec 003). Puro: el pedido lo hace
 * `app/api/geocodificar`.
 *
 * Verificado el 2026-10-13: Georef ignora lo que va despues de una coma ("…, CABA") y, sin
 * provincia, "Corrientes 1000" devuelve Rosario, Bahia Blanca... Por eso la provincia va aparte.
 */
import { coordenadasValidas } from './formato';

export const PROVINCIAS = [
  { id: '02', nombre: 'CABA' },
  { id: '06', nombre: 'Provincia de Buenos Aires' },
] as const;

export interface Candidato {
  readonly nombre: string;
  readonly lat: number;
  readonly lng: number;
}

export function urlGeoref(texto: string, provincia: string | null): string {
  const url = new URL('https://apis.datos.gob.ar/georef/api/direcciones');
  url.searchParams.set('direccion', texto.split(',')[0]!.trim());
  if (provincia) url.searchParams.set('provincia', provincia);
  url.searchParams.set('max', '8');
  return url.toString();
}

export function candidatosGeoref(respuesta: unknown): Candidato[] {
  const direcciones = (respuesta as { direcciones?: unknown } | null)?.direcciones;
  if (!Array.isArray(direcciones)) return [];
  return direcciones.flatMap((d: { nomenclatura?: unknown; ubicacion?: { lat?: unknown; lon?: unknown } }) => {
    const lat = Number(d.ubicacion?.lat);
    const lng = Number(d.ubicacion?.lon);
    const sinUbicacion = d.ubicacion?.lat === null || d.ubicacion?.lat === undefined;
    if (typeof d.nomenclatura !== 'string' || sinUbicacion || !coordenadasValidas(lat, lng)) return [];
    return [{ nombre: d.nomenclatura, lat, lng }];
  });
}
