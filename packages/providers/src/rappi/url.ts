/**
 * Donde se compra un producto de Rappi EN ESA tienda. La ficha `/p/{slug}` es generica y Rappi
 * elige la tienda, que puede no ser la que tiene el precio: por eso es una busqueda dentro de
 * la tienda. Vive aparte para que la web lo importe sin traer el cliente HTTP.
 */
export const urlProductoRappi = (nombre: string, idExternoTienda: string): string =>
  `https://www.rappi.com.ar/tiendas/${idExternoTienda}-turbo/s?term=${encodeURIComponent(nombre)}`;
