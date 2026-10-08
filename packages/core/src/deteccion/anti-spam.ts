/**
 * Capas 2 y 3 del anti-spam. Ver docs/03-motor-deteccion.md seccion 5.
 *
 * El problema: con corridas cada 30 minutos, la misma oferta se detecta 48 veces por dia. Se
 * alerta cuando algo nuevo pasa, no cuando algo sigue pasando (regla de oro 12).
 *
 * Puro: el estado vigente lo trae quien llama (el crawler, desde `alerta_estado`).
 */
import { PARAMETROS, type Parametros } from '../reglas/registry.js';

/** Lo que se aviso la ultima vez para un (tienda, producto, regla). */
export interface AlertaVigente {
  readonly precioAvisado: number;
}

/**
 * `abrir`: no habia nada vigente. `realertar`: bajo lo suficiente como para avisar de nuevo.
 * `mantener`: ya se aviso, y lo de hoy no es noticia.
 */
export type DecisionAlerta = 'abrir' | 'realertar' | 'mantener';

/** Para un producto que **dispara** la regla: ¿se avisa? */
export function decidirAlerta(
  vigente: AlertaVigente | null,
  precio: number,
  p: Parametros = PARAMETROS,
): DecisionAlerta {
  if (!vigente) return 'abrir';
  // Comparar contra el precio AVISADO, no contra el de la corrida anterior: si baja 1% por
  // corrida, cinco corridas despues bajo 5% respecto de lo que el usuario ya sabe.
  return precio <= vigente.precioAvisado * (1 - p.realertarSiBaja) ? 'realertar' : 'mantener';
}

/**
 * ¿Se cierra la alerta vigente? Con histeresis: dejar de disparar no alcanza, el precio tiene
 * que haber subido mas que el margen. Sin esto, un precio oscilando +-1% alrededor del umbral
 * abre y cierra el hallazgo en loop, y cada apertura es una alerta.
 */
export function debeCerrar(
  vigente: AlertaVigente,
  ahora: { readonly precio: number; readonly enStock: boolean; readonly sigueDisparando: boolean },
  p: Parametros = PARAMETROS,
): boolean {
  // Regla de oro 5: sin stock no es una oportunidad, se cierra sin importar el precio.
  if (!ahora.enStock) return true;
  if (ahora.sigueDisparando) return false;
  // El mismo margen que la capa 2, en espejo: docs/03 habla de "el margen", uno solo.
  return ahora.precio > vigente.precioAvisado * (1 + p.realertarSiBaja);
}
