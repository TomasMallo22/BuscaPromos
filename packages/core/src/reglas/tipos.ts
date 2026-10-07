/**
 * El tipo de las claves de regla.
 *
 * Vive dentro de `reglas/` y no en `tipos.ts` por una razon concreta: la lint rule
 * `no-clave-regla-literal` prohibe escribir una clave de regla como string literal fuera de
 * esta carpeta (ADR 0007). La declaracion del tipo es, inevitablemente, la lista de claves —
 * asi que tiene que vivir junto al registry, que es el unico lugar donde una regla se define.
 *
 * Espejo del enum `public.regla_clave` de la migracion 0001; `../tipos.test.ts` lo verifica.
 */
export type ReglaClave =
  | 'precio_absurdo'
  | 'caida_vs_historial'
  | 'descuento_extremo'
  | 'gran_descuento'
  | 'vs_otras_tiendas'
  | 'nuevo_vs_pasillo'
  | 'promo_usuario_nuevo';
