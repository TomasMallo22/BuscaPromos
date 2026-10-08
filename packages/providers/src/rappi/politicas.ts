import type { PoliticasProveedor } from '../contrato.js';

export const POLITICAS_RAPPI: PoliticasProveedor = {
  // En Rappi un producto agotado desaparece del catalogo en vez de quedar listado como
  // "sin stock". Regla de oro 8.
  faltanteEsSinStock: true,
  // `has_global_offers` + tope de 1 unidad es la promo de cuenta nueva: verificado que no
  // aplica a cuentas existentes (regla de oro 5).
  promoKindsExcluidos: ['promo_usuario_nuevo'],
  // categoriaPath = [pasillo, sub-pasillo]: el sub-pasillo son los dos niveles.
  nivelAgrupacionPasillo: 2,
  // ~350 requests por tienda: con 600 ms son 3-4 minutos. Volumen bajo a proposito (regla de
  // oro 16). Si aparecen 429, se sube esto, no se paraleliza.
  msEntreRequests: 600,
  // Rappi devuelve el sub-pasillo entero en la primera pagina y un 204 en la siguiente
  // (verificado el 2026-10-08). El tope es por si eso cambia y empieza a paginar en serio.
  maxPaginasPorGrupo: 20,
};

/**
 * Sub-pasillos que no son una categoria sino una vidriera ("Nuevos"): sus productos tambien
 * estan en su sub-pasillo real. Se recorren al final, asi el producto queda con su categoria
 * de verdad y el indice de gondola de nuevo_vs_pasillo compara yogures con yogures.
 */
export const SUBPASILLOS_VIDRIERA = /^(nuevos|novedades|ofertas|promociones|destacados)$/i;
