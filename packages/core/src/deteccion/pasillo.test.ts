/**
 * Port de `unit_index` y `subaisle_reference` de turbo/detect.py: la referencia de
 * `nuevo_vs_pasillo`. Ver docs/03-motor-deteccion.md seccion 4.
 *
 * El hazard: `Math.floor(otros.length / 10)` es division entera. Con exactamente 8 comparables
 * da indice 0, el MINIMO, no "el percentil 10". Es intencional. No lo interpoles.
 *
 * Todos los valores esperados escritos a mano se contrastaron contra el Python original.
 */
import { describe, expect, it } from 'vitest';
import { cargarCaso } from './casos.test-util.js';
import { indicePasillo, referenciaPasillo, type ProductoPasillo } from './pasillo.js';

interface ProductoCaso {
  idExterno: string;
  presentacion: string;
  precio: number;
  promoExcluida: boolean;
  enStock: boolean;
}
interface CasoPasillo {
  subPasillo: string;
  bajoTest: ProductoCaso;
  comparables: ProductoCaso[];
  ignorados: ProductoCaso[];
  esperado: {
    conOchoComparables: { referencia: number; n: number; ratio: number; dispara: boolean };
    conSieteComparables: { referencia: null; dispara: boolean };
  };
}

const caso = cargarCaso<CasoPasillo>('pasillo-comparables');
const aProducto = (d: ProductoCaso): ProductoPasillo => ({ subPasillo: caso.subPasillo, ...d });

const p = (precio: number, presentacion = '1 X 1 kg', extra: Partial<ProductoPasillo> = {}): ProductoPasillo => ({
  subPasillo: 'Yogures',
  presentacion,
  precio,
  promoExcluida: false,
  enStock: true,
  ...extra,
});
/** `n` productos de 1 kg a 1000, 1100, 1200... */
const porKilo = (n: number) => Array.from({ length: n }, (_, i) => p(1000 + i * 100));

describe('pasillo-comparables — caso validado contra el original', () => {
  const bajoTest = aProducto(caso.bajoTest);
  const comparables = caso.comparables.map(aProducto);
  const ignorados = caso.ignorados.map(aProducto);

  it('con 8 comparables la referencia es el minimo y dispara', () => {
    const indice = indicePasillo([bajoTest, ...comparables, ...ignorados]);
    const ref = referenciaPasillo(indice, bajoTest)!;
    const esperado = caso.esperado.conOchoComparables;
    expect(ref).toEqual({ referencia: esperado.referencia, n: esperado.n });
    expect(bajoTest.precio / ref.referencia).toBe(esperado.ratio);
  });

  it('con 7 comparables no alcanza el minimo: null', () => {
    const indice = indicePasillo([bajoTest, ...comparables.slice(0, -1), ...ignorados]);
    expect(referenciaPasillo(indice, bajoTest)).toBeNull();
  });

  it('las Und, los sin stock y las promos excluidas no entran al indice', () => {
    const indice = indicePasillo([bajoTest, ...comparables, ...ignorados]);
    expect([...indice.claves()]).toEqual([[caso.subPasillo, 'g']]);
    expect(indice.precios(caso.subPasillo, 'g')).toHaveLength(1 + comparables.length);
  });
});

describe('referenciaPasillo — Math.floor(n / 10)', () => {
  const bajoTest = p(100);
  it.each([
    [8, 1000], // indice 0: el minimo
    [9, 1000],
    [10, 1100], // indice 1
    [19, 1100],
    [20, 1200], // indice 2
  ])('con %i comparables la referencia es %i', (n, referencia) => {
    const indice = indicePasillo([bajoTest, ...porKilo(n)]);
    expect(referenciaPasillo(indice, bajoTest)).toEqual({ referencia, n });
  });
});

describe('referenciaPasillo — detalles', () => {
  it('la referencia es lo que costaria este producto al precio por unidad de los mas baratos', () => {
    const medioKilo = p(100, '1 X 500 g');
    expect(referenciaPasillo(indicePasillo([medioKilo, ...porKilo(8)]), medioKilo)).toEqual({
      referencia: 500,
      n: 8,
    });
  });

  it('se saca una sola ocurrencia del propio precio por unidad, no todas', () => {
    const igualAlMinimo = p(1000);
    expect(referenciaPasillo(indicePasillo([igualAlMinimo, ...porKilo(8)]), igualAlMinimo)).toEqual({
      referencia: 1000,
      n: 8,
    });
  });

  it('un producto que no esta en el indice compara contra todos', () => {
    const sinStock = p(900, '1 X 1 kg', { enStock: false });
    expect(referenciaPasillo(indicePasillo([sinStock, ...porKilo(8)]), sinStock)).toEqual({
      referencia: 1000,
      n: 8,
    });
  });

  it('como en el original, se saca una ocurrencia del mismo precio aunque no sea la propia', () => {
    // Herencia de `subaisle_reference`: busca el precio, no el producto. Si este producto no
    // esta indexado (sin stock) pero otro tiene su mismo precio por unidad, se saca al otro.
    const sinStock = p(1000, '1 X 1 kg', { enStock: false });
    expect(referenciaPasillo(indicePasillo([sinStock, ...porKilo(8)]), sinStock)).toBeNull();
  });

  it('no mezcla sub-pasillos ni dimensiones', () => {
    const bajoTest = p(100);
    const litros = Array.from({ length: 8 }, (_, i) => p(10 + i, '1 X 1 L'));
    const otroPasillo = Array.from({ length: 8 }, (_, i) => p(10 + i, '1 X 1 kg', { subPasillo: 'Quesos' }));
    expect(referenciaPasillo(indicePasillo([bajoTest, ...litros, ...otroPasillo]), bajoTest)).toBeNull();
  });

  it('un producto en "Und" no tiene referencia', () => {
    const und = p(100, '1 Und');
    expect(referenciaPasillo(indicePasillo([und, ...porKilo(8)]), und)).toBeNull();
  });

  it('un precio 0 no entra al indice', () => {
    const indice = indicePasillo([p(0), ...porKilo(8)]);
    expect(indice.precios('Yogures', 'g')).toHaveLength(8);
  });

  it('el indice queda ordenado aunque los productos lleguen desordenados', () => {
    const indice = indicePasillo([p(3000), p(1000), p(2000)]);
    expect(indice.precios('Yogures', 'g')).toEqual([1, 2, 3]);
  });

  it('un sub-pasillo que se llama como otro mas un separador no colisiona', () => {
    const a = p(100, '1 X 1 kg', { subPasillo: 'a,g' });
    const indice = indicePasillo([a, ...Array.from({ length: 8 }, () => p(1000, '1 X 1 kg', { subPasillo: 'a' }))]);
    expect(referenciaPasillo(indice, a)).toBeNull();
  });
});
