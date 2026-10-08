import { describe, expect, it } from 'vitest';
import { debeCerrar, decidirAlerta } from './anti-spam.js';

describe('decidirAlerta — capa 2: re-alertar solo si bajo mas de 5%', () => {
  it('sin alerta vigente, abre', () => {
    expect(decidirAlerta(null, 1200)).toBe('abrir');
  });

  it('mismo precio que el avisado: no avisa de nuevo (regla de oro 12)', () => {
    expect(decidirAlerta({ precioAvisado: 1200 }, 1200)).toBe('mantener');
  });

  it('bajo 3%: todavia no', () => {
    expect(decidirAlerta({ precioAvisado: 1000 }, 970)).toBe('mantener');
  });

  it('bajo exactamente 5%: re-alerta', () => {
    expect(decidirAlerta({ precioAvisado: 1000 }, 950)).toBe('realertar');
  });

  it('bajo 20%: re-alerta', () => {
    expect(decidirAlerta({ precioAvisado: 1000 }, 800)).toBe('realertar');
  });

  it('subio pero sigue disparando: mantiene', () => {
    expect(decidirAlerta({ precioAvisado: 1000 }, 1040)).toBe('mantener');
  });
});

describe('debeCerrar — capa 3: cierre con histeresis', () => {
  const vigente = { precioAvisado: 1000 };

  it('si sigue disparando, no cierra', () => {
    expect(debeCerrar(vigente, { precio: 1300, enStock: true, sigueDisparando: true })).toBe(false);
  });

  it('dejo de disparar pero subio menos del margen: queda abierta', () => {
    expect(debeCerrar(vigente, { precio: 1040, enStock: true, sigueDisparando: false })).toBe(false);
  });

  it('dejo de disparar y subio mas del margen: cierra', () => {
    expect(debeCerrar(vigente, { precio: 1060, enStock: true, sigueDisparando: false })).toBe(true);
  });

  // Regla de oro 5: un producto sin stock no se muestra como oportunidad.
  it('sin stock cierra siempre', () => {
    expect(debeCerrar(vigente, { precio: 1000, enStock: false, sigueDisparando: true })).toBe(true);
  });

  it('20 corridas oscilando +-1% alrededor del umbral: una sola alerta, ningun cierre', () => {
    // El umbral es 0.5 sobre un habitual de 2000: dispara en <= 1000.
    const umbral = 1000;
    let vigente: { precioAvisado: number } | null = null;
    let aperturas = 0;
    let realertas = 0;
    let cierres = 0;
    for (let i = 0; i < 20; i++) {
      const precio = i % 2 === 0 ? umbral * 0.99 : umbral * 1.01;
      const dispara = precio <= umbral;
      if (vigente && debeCerrar(vigente, { precio, enStock: true, sigueDisparando: dispara })) {
        cierres++;
        vigente = null;
      }
      if (!dispara) continue;
      const decision = decidirAlerta(vigente, precio);
      if (decision === 'abrir') aperturas++;
      if (decision === 'realertar') realertas++;
      if (decision !== 'mantener') vigente = { precioAvisado: precio };
    }
    expect({ aperturas, realertas, cierres }).toEqual({ aperturas: 1, realertas: 0, cierres: 0 });
  });
});
