/**
 * Las categorias comunes del feed (spec 003). Cada tienda nombra sus pasillos a su manera
 * ("Lácteos y huevos", "Quesos y fiambres"); el usuario filtra por una lista unica. Es la UNICA
 * definicion: la web la usa para los chips, el crawler para `productos.categoria`.
 *
 * Se clasifica por el PASILLO (`categoriaPath[0]`), no por el nombre del producto: el pasillo lo
 * eligio la tienda, el nombre del producto es texto libre.
 */

export const CATEGORIAS = [
  { clave: 'almacen', nombre: 'Almacén' },
  { clave: 'lacteos', nombre: 'Lácteos y quesos' },
  { clave: 'carnes', nombre: 'Carnes' },
  { clave: 'frutas_verduras', nombre: 'Frutas y verduras' },
  { clave: 'congelados', nombre: 'Congelados y comidas' },
  { clave: 'bebidas', nombre: 'Bebidas' },
  { clave: 'alcohol', nombre: 'Bebidas con alcohol' },
  { clave: 'snacks', nombre: 'Snacks y dulces' },
  { clave: 'limpieza', nombre: 'Limpieza y hogar' },
  { clave: 'perfumeria', nombre: 'Perfumería' },
  { clave: 'farmacia', nombre: 'Farmacia y salud' },
  { clave: 'bebes', nombre: 'Bebés' },
  { clave: 'mascotas', nombre: 'Mascotas' },
  { clave: 'otros', nombre: 'Otros' },
] as const;

export type CategoriaClave = (typeof CATEGORIAS)[number]['clave'];

/** Sin tildes y en minuscula: "Lácteos" y "lacteos" son lo mismo. */
const normalizar = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/**
 * En ORDEN: la primera que matchea gana. Lo especifico antes que lo general: "bebidas con
 * alcohol" antes que "bebidas", "bebe" antes que "cuidado".
 */
const REGLAS: ReadonlyArray<readonly [RegExp, CategoriaClave]> = [
  // "Bebidas SIN alcohol" tambien dice "alcohol": va primero, a bebidas.
  [/sin alcohol/, 'bebidas'],
  [/alcohol|cerveza|vino|licor|aperitivo/, 'alcohol'],
  [/bebe/, 'bebes'],
  [/mascota/, 'mascotas'],
  [/lacteo|queso|fiambre|yogur/, 'lacteos'],
  [/carne|carniceria/, 'carnes'],
  [/fruta|verdura/, 'frutas_verduras'],
  [/congelado|comida/, 'congelados'],
  [/bebida|agua|jugo|gaseosa/, 'bebidas'],
  [/snack|galletita|chocolate|dulc|golosina/, 'snacks'],
  [/limpieza|hogar|libreria/, 'limpieza'],
  [/salud|medic|digestiv|dolor|gripe|farmacia/, 'farmacia'],
  [/cuidado|maquillaje|perfum|dermo|belleza/, 'perfumeria'],
  [/almacen|mercado|cafe|yerba|panaderia|reposteria|desayuno/, 'almacen'],
];

export function categoriaComun(categoriaPath: readonly string[]): CategoriaClave {
  const pasillo = normalizar(categoriaPath[0] ?? '');
  if (!pasillo) return 'otros';
  return REGLAS.find(([patron]) => patron.test(pasillo))?.[1] ?? 'otros';
}
