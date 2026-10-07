/**
 * Que reglas dispara un producto. Port de `check` de turbo/detect.py. Ver
 * docs/03-motor-deteccion.md seccion 3.
 *
 * **La estructura es parte del contrato** (ADR 0007): dos cortes tempranos y despues una
 * acumulacion con un `else if` intencional. Cada regla sabe si dispara (`REGISTRY[...].evaluar`);
 * en que orden se preguntan y cual corta a cual se decide aca, y en ningun otro lado.
 *
 * Sin red, sin DB, sin I/O. Si estas por agregar un `await` aca, el diseño no es ese.
 */
import { REGISTRY, UMBRALES_DEFAULT, type Umbrales } from '../reglas/registry.js';
import type { Disparo, EntradaMotor } from './entrada.js';

export type { Disparo, EntradaMotor, MedianaOtrasTiendas, ProductoEvaluado } from './entrada.js';

export interface OpcionesMotor {
  readonly umbrales?: Umbrales;
  /** Evaluar `promo_usuario_nuevo` en vez de ignorar las promos excluidas. Apagado por default. */
  readonly incluirPromoUsuarioNuevo?: boolean;
}

export function evaluarReglas(e: EntradaMotor, opciones: OpcionesMotor = {}): Disparo[] {
  const u = opciones.umbrales ?? UMBRALES_DEFAULT;

  // Regla de oro 5: nunca se alerta un producto sin stock. En el original este corte esta en
  // `evaluate`, antes de llamar a `check`; aca vive en el motor para que nadie lo saltee.
  if (!e.producto.enStock) return [];

  // Promo que no le aplica al usuario (la de cuenta nueva de Rappi): CORTA.
  if (e.producto.promoExcluida) {
    const promo = opciones.incluirPromoUsuarioNuevo ? REGISTRY.promo_usuario_nuevo.evaluar(e, u) : null;
    return promo ? [promo] : [];
  }

  // $0 o $1: devuelve SOLO ese hit y CORTA. No hace falta mas analisis.
  const absurdo = REGISTRY.precio_absurdo.evaluar(e, u);
  if (absurdo) return [absurdo];

  const disparos: Disparo[] = [];
  const agregar = (d: Disparo | null) => {
    if (d) disparos.push(d);
  };

  agregar(REGISTRY.caida_vs_historial.evaluar(e, u));

  // `descuento_extremo` y `gran_descuento` son MUTUAMENTE EXCLUYENTES: el `else` es intencional.
  // Un producto al 15% del tachado ya disparo la regla fuerte; no tiene sentido reportarlo
  // tambien como "oferta fuerte". No lo "arregles".
  const extremo = REGISTRY.descuento_extremo.evaluar(e, u);
  if (extremo) {
    disparos.push(extremo);
  } else {
    agregar(REGISTRY.gran_descuento.evaluar(e, u));
  }

  agregar(REGISTRY.vs_otras_tiendas.evaluar(e, u));
  agregar(REGISTRY.nuevo_vs_pasillo.evaluar(e, u));

  return disparos;
}
