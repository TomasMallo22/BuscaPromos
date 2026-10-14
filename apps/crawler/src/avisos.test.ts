import { describe, expect, it } from 'vitest';
import { REGISTRY } from '@buscapromos/core';
import {
  coincideTermino,
  elegirDescuentos,
  elegirHallazgos,
  elegirParaEnviar,
  enSilencio,
  terminoQueCoincide,
  type PreferenciasAvisos,
} from './avisos.js';

// 2026-10-14 a la hora dada en Argentina (UTC-3).
const art = (hora: number, minuto = 0) => Date.UTC(2026, 9, 14, hora + 3, minuto) / 1000;

const prefs = (p: Partial<PreferenciasAvisos> = {}): PreferenciasAvisos => ({
  categorias: [],
  terminos: [],
  silencioDesde: 23,
  silencioHasta: 8,
  maxPorHora: 6,
  ...p,
});

describe('coincideTermino — E4', () => {
  it.each([
    ['Yogur Natural Entero La Serenísima 1 kg', 'yogurt natural'],
    ['Aceite de Oliva Extra Virgen Cocinero 500 ml', 'aceite de oliva'],
    ['ACEITE DE OLIVA', 'Aceites de oliva'],
    ['Café Molido La Virginia', 'cafe'],
  ])('"%s" coincide con "%s"', (nombre, termino) => {
    expect(coincideTermino(nombre, termino)).toBe(true);
  });

  it.each([
    ['Aceite de Girasol Natura', 'aceite de oliva'],
    ['Yogur Bebible Frutilla', 'yogurt natural'],
    ['Cualquier cosa', ''],
  ])('"%s" NO coincide con "%s"', (nombre, termino) => {
    expect(coincideTermino(nombre, termino)).toBe(false);
  });

  it('devuelve cual de los terminos coincidio', () => {
    expect(terminoQueCoincide('Yogur Natural', ['aceite de oliva', 'yogurt natural'])).toBe('yogurt natural');
    expect(terminoQueCoincide('Fideos', ['aceite de oliva'])).toBeNull();
  });
});

describe('enSilencio — E6', () => {
  it('23 a 8: las 2 de la mañana es silencio, las 10 no', () => {
    expect(enSilencio(art(2), 23, 8)).toBe(true);
    expect(enSilencio(art(23, 30), 23, 8)).toBe(true);
    expect(enSilencio(art(10), 23, 8)).toBe(false);
    expect(enSilencio(art(8), 23, 8)).toBe(false);
  });
  it('un rango que no cruza la medianoche (14 a 16)', () => {
    expect(enSilencio(art(15), 14, 16)).toBe(true);
    expect(enSilencio(art(17), 14, 16)).toBe(false);
  });
  it('desde == hasta: sin silencio', () => {
    expect(enSilencio(art(3), 0, 0)).toBe(false);
  });
});

const hallazgo = (productoId: string, regla: keyof typeof REGISTRY, ratio: number, extra: Partial<{ categoria: string; nombre: string }> = {}) => ({
  hallazgoId: `h-${productoId}-${regla}`,
  productoId,
  tiendaId: 't',
  regla: REGISTRY[regla].clave,
  ratio,
  categoria: extra.categoria ?? 'lacteos',
  nombre: extra.nombre ?? 'Yogur Natural',
});

describe('elegirHallazgos', () => {
  it('E2: solo los de mis categorias o terminos', () => {
    const elegidos = elegirHallazgos(
      [hallazgo('a', 'caida_vs_historial', 0.4), hallazgo('b', 'caida_vs_historial', 0.3, { categoria: 'limpieza', nombre: 'Lavandina' })],
      prefs({ categorias: ['lacteos'] }),
    );
    expect(elegidos.map((h) => h.productoId)).toEqual(['a']);
  });

  it('un termino trae algo de otra categoria', () => {
    const elegidos = elegirHallazgos(
      [hallazgo('b', 'caida_vs_historial', 0.3, { categoria: 'almacen', nombre: 'Aceite de Oliva 500 ml' })],
      prefs({ terminos: ['aceite de oliva'] }),
    );
    expect(elegidos).toHaveLength(1);
  });

  it('E5: tres reglas del mismo producto, un aviso: el de menor ratio', () => {
    const elegidos = elegirHallazgos(
      [hallazgo('a', 'caida_vs_historial', 0.4), hallazgo('a', 'vs_otras_tiendas', 0.3), hallazgo('a', 'nuevo_vs_pasillo', 0.35)],
      prefs({ categorias: ['lacteos'] }),
    );
    expect(elegidos.map((h) => h.regla)).toEqual([REGISTRY.vs_otras_tiendas.clave]);
  });

  it('empate de ratio: gana la de menor orden en el registry', () => {
    const elegidos = elegirHallazgos(
      [hallazgo('a', 'vs_otras_tiendas', 0.3), hallazgo('a', 'caida_vs_historial', 0.3)],
      prefs({ categorias: ['lacteos'] }),
    );
    expect(elegidos[0]?.regla).toBe(REGISTRY.caida_vs_historial.clave);
  });

  it('sin preferencias no llega nada (opt-in)', () => {
    expect(elegirHallazgos([hallazgo('a', 'caida_vs_historial', 0.1)], prefs())).toEqual([]);
  });
});

describe('elegirDescuentos — E3 y E9', () => {
  const desc = (productoId: string, nombre: string, precio: number, precioLista: number) => ({
    productoId,
    tiendaId: 't',
    nombre,
    precio,
    precioLista,
  });

  it('solo por termino, y solo con 30% o mas', () => {
    const elegidos = elegirDescuentos(
      [desc('a', 'Aceite de Oliva 500 ml', 650, 1000), desc('b', 'Aceite de Oliva 1 L', 800, 1000), desc('c', 'Yogur', 100, 1000)],
      prefs({ terminos: ['aceite de oliva'], categorias: ['lacteos'] }),
      new Map(),
      new Set(),
    );
    expect(elegidos.map((d) => [d.productoId, d.termino])).toEqual([['a', 'aceite de oliva']]);
  });

  it('ya avisado al mismo precio: no; si bajo mas de 5%: si', () => {
    const avisados = new Map([['t|a', 650]]);
    const p = prefs({ terminos: ['aceite de oliva'] });
    expect(elegirDescuentos([desc('a', 'Aceite de Oliva', 650, 1000)], p, avisados, new Set())).toEqual([]);
    expect(elegirDescuentos([desc('a', 'Aceite de Oliva', 600, 1000)], p, avisados, new Set())).toHaveLength(1);
  });

  it('si el producto ya va como hallazgo, no se manda tambien como descuento', () => {
    expect(
      elegirDescuentos([desc('a', 'Aceite de Oliva', 500, 1000)], prefs({ terminos: ['aceite de oliva'] }), new Map(), new Set(['t|a'])),
    ).toEqual([]);
  });
});

describe('elegirParaEnviar — E6 y E7', () => {
  const pendiente = (clave: string, ratio: number, horasAtras = 0) => ({ clave, ratio, creadoAt: art(12) - horasAtras * 3600 });

  it('en horario silencioso no sale nada, y nada vence por eso', () => {
    const r = elegirParaEnviar([pendiente('a', 0.4)], { ahora: art(2), enviadosUltimaHora: 0, prefs: prefs() });
    expect(r).toEqual({ enviar: [], vencidos: [] });
  });

  it('15 pendientes y tope 6: salen los 6 de mas descuento', () => {
    const pendientes = Array.from({ length: 15 }, (_, i) => pendiente(`p${i}`, 0.2 + i * 0.01));
    const r = elegirParaEnviar(pendientes, { ahora: art(12), enviadosUltimaHora: 0, prefs: prefs() });
    expect(r.enviar.map((p) => p.clave)).toEqual(['p0', 'p1', 'p2', 'p3', 'p4', 'p5']);
  });

  it('el tope cuenta lo que ya salio en la ultima hora', () => {
    const r = elegirParaEnviar([pendiente('a', 0.2), pendiente('b', 0.3)], { ahora: art(12), enviadosUltimaHora: 5, prefs: prefs() });
    expect(r.enviar.map((p) => p.clave)).toEqual(['a']);
  });

  it('lo de mas de 24 h vence en vez de salir tarde', () => {
    const r = elegirParaEnviar([pendiente('viejo', 0.1, 25), pendiente('nuevo', 0.5)], { ahora: art(12), enviadosUltimaHora: 0, prefs: prefs() });
    expect(r.vencidos.map((p) => p.clave)).toEqual(['viejo']);
    expect(r.enviar.map((p) => p.clave)).toEqual(['nuevo']);
  });
});
