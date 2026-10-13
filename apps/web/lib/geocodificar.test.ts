import { describe, expect, it } from 'vitest';
import { candidatosGeoref, urlGeoref } from './geocodificar';

// Respuesta real de Georef para "Av. Corrientes 1000", 2026-10-13 (un punto publico).
const RESPUESTA = {
  cantidad: 2,
  direcciones: [
    {
      nomenclatura: 'AV CORRIENTES 1000, Rosario, Santa Fe',
      ubicacion: { lat: -32.9482812136384, lon: -60.6430110065663 },
    },
    {
      nomenclatura: 'AV CORRIENTES 1000, Comuna 1, Ciudad Autónoma de Buenos Aires',
      ubicacion: { lat: -34.6036694728664, lon: -58.3809752829037 },
    },
  ],
};

describe('urlGeoref', () => {
  it('manda solo la calle y altura: lo que va despues de una coma Georef lo ignora', () => {
    const url = new URL(urlGeoref('Av. Corrientes 1000, CABA', '02'));
    expect(url.searchParams.get('direccion')).toBe('Av. Corrientes 1000');
    expect(url.searchParams.get('provincia')).toBe('02');
  });

  it('sin provincia no filtra', () => {
    expect(new URL(urlGeoref('Cabildo 2000', null)).searchParams.has('provincia')).toBe(false);
  });
});

describe('candidatosGeoref', () => {
  it('nombre y coordenadas de cada candidato', () => {
    expect(candidatosGeoref(RESPUESTA)).toEqual([
      { nombre: 'AV CORRIENTES 1000, Rosario, Santa Fe', lat: -32.9482812136384, lng: -60.6430110065663 },
      { nombre: 'AV CORRIENTES 1000, Comuna 1, Ciudad Autónoma de Buenos Aires', lat: -34.6036694728664, lng: -58.3809752829037 },
    ]);
  });

  it('sin resultados, o una respuesta rara: lista vacia, no una excepcion', () => {
    expect(candidatosGeoref({ cantidad: 0, direcciones: [] })).toEqual([]);
    expect(candidatosGeoref({ errores: [{ mensaje: 'x' }] })).toEqual([]);
    expect(candidatosGeoref(null)).toEqual([]);
  });

  it('descarta candidatos sin ubicacion o fuera de Argentina', () => {
    expect(
      candidatosGeoref({ direcciones: [{ nomenclatura: 'x', ubicacion: { lat: null, lon: null } }, { nomenclatura: 'y', ubicacion: { lat: 40, lon: -74 } }] }),
    ).toEqual([]);
  });
});
