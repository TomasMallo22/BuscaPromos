import { describe, expect, it } from 'vitest';
import { REGISTRY } from '@buscapromos/core';
import { detectarProducto, evaluarGuarda, faltantes, planificarHallazgos, subPasilloDe } from './planificar.js';

const DIA = 86400;
const AHORA = 1_000 * DIA;
const r = REGISTRY;

describe('evaluarGuarda — regla de oro 6', () => {
  it('primera corrida con un catalogo de verdad: ok', () => {
    expect(evaluarGuarda(354, 0)).toEqual({ ok: true });
  });
  it('menos de 100 productos: descartada aunque pase el 50% (piso absoluto)', () => {
    expect(evaluarGuarda(31, 60).ok).toBe(false);
  });
  it('trajo el 40% de lo conocido: descartada (E6)', () => {
    expect(evaluarGuarda(2400, 6000)).toEqual({ ok: false, motivo: 'trajo 2400 de 6000 productos conocidos (40%)' });
  });
  it('trajo el 50% justo: ok', () => {
    expect(evaluarGuarda(3000, 6000).ok).toBe(true);
  });
});

describe('faltantes — reglas de oro 7 y 8', () => {
  const actuales = [
    { productoId: 'a', enStock: true },
    { productoId: 'b', enStock: true },
    { productoId: 'c', enStock: true },
    { productoId: 'd', enStock: false },
  ];
  const categorias = new Map([
    ['a', ['Bebidas', 'Gaseosas']],
    ['b', ['Lacteos', 'Yogures']],
    ['c', ['Almacen', 'Arroz']],
    ['d', ['Bebidas', 'Gaseosas']],
  ]);

  it('lo que no aparecio se marca sin stock, salvo lo de un grupo fallido', () => {
    const vistos = new Set(['a']);
    const fallidos = [['Lacteos', 'Yogures'], ['Almacen']];
    expect(faltantes(actuales, vistos, categorias, fallidos)).toEqual([]);
    expect(faltantes(actuales, vistos, categorias, [['Lacteos', 'Yogures']])).toEqual(['c']);
  });

  it('lo que ya estaba sin stock no se vuelve a marcar', () => {
    expect(faltantes(actuales, new Set(['a', 'b', 'c']), categorias, [])).toEqual([]);
  });
});

describe('subPasilloDe', () => {
  it('toma el prefijo que dice la politica', () => {
    expect(subPasilloDe(['Bebidas', 'Gaseosas'], 2)).toBe('Bebidas › Gaseosas');
  });
});

describe('detectarProducto', () => {
  const base = { precio: 1000, precioLista: null, promoExcluida: false, enStock: true };

  it('sin historial ni gondola, nada', () => {
    expect(detectarProducto({ ...base, historial: [], pasillo: null, ahora: AHORA })).toEqual({ disparos: [], estadoOferta: 'sin_historial' });
  });

  it('primera corrida con tachado al 15%: descuento_extremo', () => {
    const { disparos } = detectarProducto({ ...base, precio: 150, precioLista: 1000, historial: [], pasillo: null, ahora: AHORA });
    expect(disparos.map((d) => d.regla)).toEqual([r.descuento_extremo.clave]);
  });

  it('con 20 dias a $5500 y hoy a $1200: caida_vs_historial con referencia 5500 (E3)', () => {
    const historial = [
      { ts: AHORA - 20 * DIA, precio: 5500, promoExcluida: false, enStock: true },
      { ts: AHORA - 60, precio: 1200, promoExcluida: false, enStock: true },
    ];
    const { disparos } = detectarProducto({ ...base, precio: 1200, historial, pasillo: null, ahora: AHORA });
    const caida = disparos.find((d) => d.regla === r.caida_vs_historial.clave);
    expect(caida?.precioReferencia).toBe(5500);
    expect(caida?.ratio).toBeCloseTo(0.218, 3);
  });

  it('sin stock no dispara nada (regla de oro 5)', () => {
    const { disparos } = detectarProducto({ ...base, precio: 1, enStock: false, historial: [], pasillo: null, ahora: AHORA });
    expect(disparos).toEqual([]);
  });
});

describe('planificarHallazgos', () => {
  const disparo = (regla: typeof r.caida_vs_historial.clave, ratio: number) => ({
    regla,
    precioReferencia: 1000,
    ratio,
    detalle: {},
  });

  it('dispara por primera vez: abre', () => {
    const plan = planificarHallazgos([
      { productoId: 'p', precio: 400, enStock: true, estadoOferta: 'sin_historial', disparos: [disparo(r.caida_vs_historial.clave, 0.4)] },
    ], []);
    expect(plan.abrir).toHaveLength(1);
    expect(plan.abrir[0]).toMatchObject({ productoId: 'p', reemplaza: null });
    expect(plan.cerrar).toEqual([]);
  });

  it('sigue igual: no abre nada nuevo (regla de oro 12)', () => {
    const vigente = { productoId: 'p', regla: r.caida_vs_historial.clave, precioAvisado: 400, hallazgoId: 'h1' };
    const plan = planificarHallazgos([
      { productoId: 'p', precio: 400, enStock: true, estadoOferta: 'sin_historial', disparos: [disparo(r.caida_vs_historial.clave, 0.4)] },
    ], [vigente]);
    expect(plan).toEqual({ abrir: [], cerrar: [] });
  });

  it('bajo mas de 5%: re-aviso que reemplaza al anterior', () => {
    const vigente = { productoId: 'p', regla: r.caida_vs_historial.clave, precioAvisado: 400, hallazgoId: 'h1' };
    const plan = planificarHallazgos([
      { productoId: 'p', precio: 300, enStock: true, estadoOferta: 'sin_historial', disparos: [disparo(r.caida_vs_historial.clave, 0.3)] },
    ], [vigente]);
    expect(plan.abrir[0]).toMatchObject({ reemplaza: 'h1', precio: 300 });
  });

  it('volvio a su precio: cierra', () => {
    const vigente = { productoId: 'p', regla: r.caida_vs_historial.clave, precioAvisado: 400, hallazgoId: 'h1' };
    const plan = planificarHallazgos([{ productoId: 'p', precio: 1000, enStock: true, estadoOferta: 'sin_historial', disparos: [] }], [vigente]);
    expect(plan.cerrar).toEqual([vigente]);
  });

  it('se quedo sin stock: cierra aunque siga barato', () => {
    const vigente = { productoId: 'p', regla: r.caida_vs_historial.clave, precioAvisado: 400, hallazgoId: 'h1' };
    const plan = planificarHallazgos([{ productoId: 'p', precio: 400, enStock: false, estadoOferta: 'sin_historial', disparos: [] }], [vigente]);
    expect(plan.cerrar).toEqual([vigente]);
  });
});
