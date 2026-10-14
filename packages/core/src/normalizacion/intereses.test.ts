/**
 * Lo que le interesa a cada usuario (spec 005): la misma busqueda para el feed y para Telegram.
 */
import { describe, expect, it } from 'vitest';
import { REGISTRY } from '../reglas/registry.js';
import { coincideTermino, interesa, seMuestra, terminoQueCoincide } from './intereses.js';

describe('coincideTermino — E4 de la 004, E7 de la 005', () => {
  it.each([
    ['Yogur Natural Entero La Serenísima 1 kg', 'yogurt natural'],
    ['Aceite de Oliva Extra Virgen Cocinero 500 ml', 'aceite de oliva'],
    ['ACEITE DE OLIVA', 'Aceites de oliva'],
    ['Café Molido La Virginia', 'cafe'],
    ['Azúcar Ledesma 1 kg', 'azucar'],
    ['Oliva aceite de', 'aceite de oliva'],
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

const intereses = { categorias: ['lacteos'], terminos: ['aceite de oliva'] };

describe('interesa — E1', () => {
  it('por categoria', () => {
    expect(interesa({ categoria: 'lacteos', nombre: 'Queso Cremoso' }, intereses)).toBe(true);
  });
  it('por termino, aunque sea de otra categoria', () => {
    expect(interesa({ categoria: 'almacen', nombre: 'Aceite de Oliva 500 ml' }, intereses)).toBe(true);
  });
  it('ni lo uno ni lo otro', () => {
    expect(interesa({ categoria: 'bebidas_alcohol', nombre: 'Vino Tinto' }, intereses)).toBe(false);
  });
  it('sin categoria (producto todavia sin clasificar): solo por termino', () => {
    expect(interesa({ categoria: null, nombre: 'Aceite de Oliva' }, intereses)).toBe(true);
    expect(interesa({ categoria: null, nombre: 'Vino' }, intereses)).toBe(false);
  });
});

describe('seMuestra — E2 y E3', () => {
  const vino = { categoria: 'bebidas_alcohol', nombre: 'Vino Tinto' };

  it.each(['precio_absurdo', 'caida_vs_historial', 'gran_descuento'] as const)('%s pasa aunque no interese: es extrema', (regla) => {
    expect(seMuestra({ ...vino, regla: REGISTRY[regla].clave }, intereses)).toBe(true);
  });

  it.each(['descuento_extremo', 'vs_otras_tiendas', 'nuevo_vs_pasillo'] as const)('%s no pasa si no interesa', (regla) => {
    expect(seMuestra({ ...vino, regla: REGISTRY[regla].clave }, intereses)).toBe(false);
  });

  it('cualquier regla pasa si interesa', () => {
    expect(seMuestra({ categoria: 'lacteos', nombre: 'Yogur', regla: REGISTRY.vs_otras_tiendas.clave }, intereses)).toBe(true);
  });
});
