import { describe, expect, it } from 'vitest';
import { CATEGORIAS, categoriaComun } from './categoria.js';

/**
 * Los nombres de pasillo REALES de las 11 tiendas que se siguen (Turbo, Turbo 24 hs y los 9
 * supermercados), sacados de `aisles_tree` el 2026-10-13. Si una tienda renombra un pasillo y
 * cae en `otros`, este test no lo ve: lo ve el feed. Por eso la lista esta entera.
 */
const REALES: Record<string, string> = {
  'Almacén': 'almacen',
  'Mercado': 'almacen',
  'Café, yerba y mate cocido': 'almacen',
  'Panadería y repostería': 'almacen',
  'Lácteos y huevos': 'lacteos',
  'Quesos y fiambres': 'lacteos',
  'Carnicería': 'carnes',
  'Frutas y Verduras': 'frutas_verduras',
  'Frutas y verduras': 'frutas_verduras',
  'Congelados': 'congelados',
  'Comida preparada': 'congelados',
  'Comidas listas': 'congelados',
  'Bebidas': 'bebidas',
  'Bebidas sin alcohol': 'bebidas',
  'Bebidas con alcohol': 'alcohol',
  'Cervezas': 'alcohol',
  'Cervezas y licores': 'alcohol',
  'Vinos': 'alcohol',
  'Snacks': 'snacks',
  'Snacks y Galletitas': 'snacks',
  'Snacks y galletitas': 'snacks',
  'Chocolates y Dulceria': 'snacks',
  'Chocolates y Dulcería': 'snacks',
  'Cuidado Hogar': 'limpieza',
  'Hogar ': 'limpieza',
  'Hogar y limpieza': 'limpieza',
  'Librería y hogar': 'limpieza',
  'Cuidado Personal': 'perfumeria',
  'Cuidado personal': 'perfumeria',
  'Cuidado Oral': 'perfumeria',
  'Cuidado de la piel': 'perfumeria',
  'Cuidado del cabello': 'perfumeria',
  'Maquillaje': 'perfumeria',
  'Perfumes': 'perfumeria',
  'Dermocosmética': 'perfumeria',
  'Bienestar y Salud': 'farmacia',
  'Salud': 'farmacia',
  'Salud Nutricional': 'farmacia',
  'Salud sexual': 'farmacia',
  'Salud visual': 'farmacia',
  'Cuidado digestivo': 'farmacia',
  'Dolor e inflamación': 'farmacia',
  'Gripe y alergias': 'farmacia',
  'Equipo y material médico': 'farmacia',
  'Cuidado del bebé': 'bebes',
  'Mundo bebé': 'bebes',
  'Mascotas': 'mascotas',
  'Otros': 'otros',
  'Combos': 'otros',
  'Complementos': 'otros',
};

describe('categoriaComun', () => {
  it.each(Object.entries(REALES))('"%s" -> %s', (pasillo, esperada) => {
    expect(categoriaComun([pasillo, 'cualquier sub-pasillo'])).toBe(esperada);
  });

  // El orden de las reglas importa: "Bebidas con alcohol" contiene "bebidas", y "Cuidado del
  // bebé" contiene "cuidado".
  it('"Bebidas con alcohol" no cae en bebidas, ni "Cuidado del bebé" en perfumeria', () => {
    expect(categoriaComun(['Bebidas con alcohol'])).toBe('alcohol');
    expect(categoriaComun(['Cuidado del bebé'])).toBe('bebes');
  });

  it('sin pasillo, o uno que no se conoce: otros', () => {
    expect(categoriaComun([])).toBe('otros');
    expect(categoriaComun(['Algo nuevo de Rappi'])).toBe('otros');
  });

  it('cada clave que devuelve existe en CATEGORIAS', () => {
    const claves = new Set(CATEGORIAS.map((c) => c.clave));
    for (const esperada of new Set(Object.values(REALES))) expect(claves.has(esperada as never)).toBe(true);
  });
});
