import { describe, expect, it } from 'vitest';
import { REGISTRY } from '@buscapromos/core';
import { mensajeDescuento, mensajeHallazgo } from './mensaje.js';

const tienda = { idExterno: '130340', tipo: 'coto', nombre: 'Coto' };

describe('mensajeHallazgo — E2', () => {
  const texto = mensajeHallazgo({
    regla: REGISTRY.vs_otras_tiendas.clave,
    nombre: 'Aceite de Oliva <Extra> & Virgen',
    presentacion: '500 ml',
    precio: 4200,
    precioReferencia: 8400,
    ratio: 0.5,
    tienda,
  });

  it('titulo y emoji salen del registry (regla de oro 10)', () => {
    expect(texto).toContain(`${REGISTRY.vs_otras_tiendas.emoji} <b>${REGISTRY.vs_otras_tiendas.titulo}</b>`);
  });

  it('precio en formato argentino, la referencia al lado y cuanto bajo', () => {
    expect(texto).toContain('<b>$4.200</b> en Coto');
    expect(texto).toContain('antes $8.400, 50% menos');
  });

  it('escapa el HTML del nombre: Rappi no lo controla nadie', () => {
    expect(texto).toContain('Aceite de Oliva &lt;Extra&gt; &amp; Virgen');
  });

  it('el link va a la tienda de esa oferta', () => {
    expect(texto).toContain('href="https://www.rappi.com.ar/tiendas/130340-coto/s?term=');
  });
});

describe('mensajeDescuento — E3', () => {
  const texto = mensajeDescuento({ nombre: 'Aceite de Oliva', presentacion: null, precio: 650, precioLista: 1000, tienda, termino: 'aceite de oliva' });

  it('dice que es un descuento ANUNCIADO, sin verificar', () => {
    expect(texto).toContain('Descuento que anuncia Rappi');
    expect(texto).toContain('sin verificar');
  });

  it('dice por que busqueda llego y cuanto es', () => {
    expect(texto).toContain('tachado $1.000, 35% menos');
    expect(texto).toContain('“aceite de oliva”');
  });
});
