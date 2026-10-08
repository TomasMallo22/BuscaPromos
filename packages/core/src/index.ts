export * from './tipos.js';
export type { ReglaClave } from './reglas/tipos.js';
export {
  CLAVES_REGLA,
  PARAMETROS,
  REGISTRY,
  UMBRALES_DEFAULT,
  type DefinicionRegla,
  type Parametros,
  type Umbrales,
} from './reglas/registry.js';
export { parsearPresentacion, type Cantidad, type Dimension } from './normalizacion/presentacion.js';
export { duracionesPorPrecio, precioHabitual } from './deteccion/precio-habitual.js';
export { estadoOferta, type ResultadoOferta } from './deteccion/estado-oferta.js';
export {
  IndicePasillo,
  indicePasillo,
  referenciaPasillo,
  type ProductoPasillo,
  type ReferenciaPasillo,
} from './deteccion/pasillo.js';
export {
  evaluarReglas,
  type Disparo,
  type EntradaMotor,
  type MedianaOtrasTiendas,
  type OpcionesMotor,
  type ProductoEvaluado,
} from './deteccion/motor.js';
export { debeCerrar, decidirAlerta, type AlertaVigente, type DecisionAlerta } from './deteccion/anti-spam.js';
