/**
 * `npm run corrida:seca`: recorre una tienda de verdad y corre la deteccion como si fuera su
 * primera corrida, SIN tocar la base. Para probar el cliente de Rappi y el motor juntos antes
 * de mergear un cambio (docs/07-operacion.md).
 *
 *   npm run corrida:seca            # la Turbo del Obelisco, un punto publico
 *   npm run corrida:seca -- coto    # otra tienda de TIENDAS_RAPPI, en la misma zona
 *
 * Siempre en el Obelisco: la salida va a la consola, y en Actions al log publico.
 */
import { randomUUID } from 'node:crypto';
import { indicePasillo, referenciaPasillo, REGISTRY } from '@buscapromos/core';
import { ClienteRed, crearRappi, promoExcluida, TIENDAS_RAPPI, type ProductoNormalizado } from '@buscapromos/providers';
import { detectarProducto, presentacionComparable, subPasilloDe } from './planificar.js';

const OBELISCO = { lat: -34.60372, lng: -58.38159 };
/** De noche el router no lista la Turbo: se usa la conocida (bitacora-api, 2026-10-07). */
const TURBO_OBELISCO = { tipo: 'turbo', idExterno: '266872', nombre: 'Rappi Turbo', consulta: OBELISCO };
const tipo = process.argv[2] ?? 'turbo';
const proveedor = crearRappi({
  deviceId: process.env['RAPPI_DEVICE_ID'] || randomUUID(),
  appVersion: process.env['RAPPI_APP_VERSION'] || 'web_v1.223.2',
});
const pol = proveedor.politicas;
let token: { token: string; expiraAt: Date } | null = null;
const ctx = {
  http: new ClienteRed({ msEntreRequests: pol.msEntreRequests }),
  credenciales: { leer: async () => token, guardar: async (t: string, e: Date) => void (token = { token: t, expiraAt: e }) },
};

const tienda = (await proveedor.resolverTiendas(OBELISCO, ctx)).find((t) => t.tipo === tipo) ?? (tipo === 'turbo' ? TURBO_OBELISCO : null);
if (!tienda) {
  console.error(`No hay "${tipo}" en el Obelisco ahora. Tipos: ${TIENDAS_RAPPI.map((t) => t.tipo).join(', ')}`);
  process.exit(2);
}
console.log(`${tienda.nombre} ${tienda.idExterno}`);
const inicio = Date.now();
const productos: ProductoNormalizado[] = [];
const fallidos: string[] = [];
for await (const lote of proveedor.recorrer(tienda, ctx)) {
  if (lote.falloMotivo) fallidos.push(`${lote.categoriaPath.join(' › ')} (${lote.falloMotivo})`);
  productos.push(...lote.productos);
  process.stdout.write(`\r${productos.length} productos…`);
}
console.log(`\n${productos.length} productos en ${Math.round((Date.now() - inicio) / 1000)} s, ${fallidos.length} grupos fallidos`);
for (const f of fallidos) console.log(`  fallo: ${f}`);

const indice = indicePasillo(
  productos.map((p) => ({
    subPasillo: subPasilloDe(p.categoriaPath, pol.nivelAgrupacionPasillo),
    presentacion: presentacionComparable(p),
    precio: p.precio,
    promoExcluida: promoExcluida(p.promoKind, pol),
    enStock: p.enStock,
  })),
);
const ahora = Math.floor(Date.now() / 1000);
const hallazgos = productos.flatMap((p) => {
  const excluida = promoExcluida(p.promoKind, pol);
  const subPasillo = subPasilloDe(p.categoriaPath, pol.nivelAgrupacionPasillo);
  const { disparos } = detectarProducto({
    precio: p.precio,
    precioLista: p.precioLista,
    promoExcluida: excluida,
    enStock: p.enStock,
    historial: [{ ts: ahora, precio: p.precio, promoExcluida: excluida, enStock: p.enStock }],
    pasillo: referenciaPasillo(indice, { subPasillo, presentacion: presentacionComparable(p), precio: p.precio, promoExcluida: excluida, enStock: p.enStock }),
    ahora,
  });
  return disparos.map((d) => ({ p, d }));
});

const pesos = (n: number) => `$${n.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;
console.log(`\n${hallazgos.length} hallazgos de primera corrida:`);
for (const { p, d } of hallazgos.sort((a, b) => (a.d.ratio ?? 1) - (b.d.ratio ?? 1)).slice(0, 25)) {
  const regla = REGISTRY[d.regla];
  const ref = d.precioReferencia ? ` (ref ${pesos(d.precioReferencia)}, ${Math.round((1 - (d.ratio ?? 1)) * 100)}% menos)` : '';
  console.log(`  ${regla.emoji} ${regla.titulo}: ${p.nombre} — ${pesos(p.precio)}${ref}`);
}

// Lo que estuvo cerca: sirve para calibrar expectativas del arranque ciego, no para alertar.
console.log(`\nMayores descuentos sobre el tachado (descuento_extremo dispara en <= ${REGISTRY.descuento_extremo.umbral}):`);
for (const p of productos
  .filter((x) => x.enStock && x.precioLista && x.precioLista > x.precio && !promoExcluida(x.promoKind, pol))
  .sort((a, b) => a.precio / a.precioLista! - b.precio / b.precioLista!)
  .slice(0, 8)) {
  console.log(`  ${(p.precio / p.precioLista!).toFixed(2)}  ${p.nombre} — ${pesos(p.precio)} (tachado ${pesos(p.precioLista!)})`);
}
console.log(`\nMas baratos contra su gondola (nuevo_vs_pasillo dispara en <= ${REGISTRY.nuevo_vs_pasillo.umbral}):`);
const contraGondola = productos.flatMap((p) => {
  const excluida = promoExcluida(p.promoKind, pol);
  const ref = referenciaPasillo(indice, { subPasillo: subPasilloDe(p.categoriaPath, pol.nivelAgrupacionPasillo), presentacion: presentacionComparable(p), precio: p.precio, promoExcluida: excluida, enStock: p.enStock });
  return ref && p.enStock && !excluida ? [{ p, ratio: p.precio / ref.referencia, ref }] : [];
});
for (const { p, ratio, ref } of contraGondola.sort((a, b) => a.ratio - b.ratio).slice(0, 8)) {
  console.log(`  ${ratio.toFixed(2)}  ${p.nombre} (${p.presentacion}) — ${pesos(p.precio)} vs ${pesos(ref.referencia)} de su gondola (${ref.n} comparables)`);
}
console.log(`\n${contraGondola.length} productos con gondola comparable; ${productos.filter((x) => x.promoKind === 'descuento_lista').length} con precio tachado`);
