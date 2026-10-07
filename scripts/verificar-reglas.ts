/**
 * Verifica que el enum `regla_clave` de Postgres coincida exactamente con el registry de
 * reglas de `packages/core`.
 *
 * Por que: en el repo original, `'caida_vs_historial'` estaba escrito como string literal en
 * cinco archivos distintos. Agregar una regla tocaba cinco lugares; renombrarla rompia el
 * historial de alertas en silencio. Ver docs/adr/0007-registry-de-reglas-unico.md.
 *
 * El enum se lee del SQL de la migracion, no de una base: asi este chequeo corre en CI sin
 * necesitar Postgres, y falla en el Pull Request en vez de en produccion.
 *
 * Mientras el registry todavia no exista (spec 000), el script no falla: informa y sale 0.
 * Es a proposito — el chequeo tiene que estar en CI desde el principio, porque si se agrega
 * despues nadie se acuerda.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MIGRACION = resolve(raiz, 'supabase/migrations/0001_enums_y_schemas.sql');
const REGISTRY = resolve(raiz, 'packages/core/src/reglas/registry.ts');

function clavesDelEnum(sql: string): string[] {
  // create type public.regla_clave as enum ( 'a', 'b', ... );
  const bloque = /create\s+type\s+public\.regla_clave\s+as\s+enum\s*\(([\s\S]*?)\)\s*;/i.exec(sql);
  if (!bloque?.[1]) throw new Error(`No encontre el enum regla_clave en ${MIGRACION}`);
  // Se ignoran los comentarios de linea para no capturar una clave mencionada en una nota.
  const sinComentarios = bloque[1].replace(/--[^\n]*/g, '');
  return [...sinComentarios.matchAll(/'([^']+)'/g)].map((m) => m[1]!);
}

function clavesDelRegistry(ts: string): string[] {
  // Las claves son las propiedades de REGISTRY. Se parsea con regex y no importando el modulo
  // para que el chequeo no dependa de que packages/core compile: si el registry esta roto,
  // queremos que falle `typecheck` con su propio mensaje, no este script con uno confuso.
  const bloque = /export\s+const\s+REGISTRY[^=]*=\s*\{([\s\S]*?)\n\}\s*(?:as\s+const)?\s*;/.exec(ts);
  if (!bloque?.[1]) throw new Error(`No encontre `+'`export const REGISTRY`'+` en ${REGISTRY}`);
  const sinComentarios = bloque[1].replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  // Solo las propiedades de primer nivel: `  clave: {` o `  'clave': {`
  return [...sinComentarios.matchAll(/^\s{2}'?([a-z_]+)'?\s*:/gm)].map((m) => m[1]!);
}

function main(): number {
  if (!existsSync(REGISTRY)) {
    console.log('reglas:verificar — todavia no existe packages/core/src/reglas/registry.ts.');
    console.log('  El chequeo esta en CI desde el principio a proposito: cuando el registry');
    console.log('  aparezca, la deriva con el enum se detecta sola. Nada que verificar aun.');
    return 0;
  }

  const enEnum = clavesDelEnum(readFileSync(MIGRACION, 'utf8'));
  const enRegistry = clavesDelRegistry(readFileSync(REGISTRY, 'utf8'));

  const faltanEnEnum = enRegistry.filter((c) => !enEnum.includes(c));
  const faltanEnRegistry = enEnum.filter((c) => !enRegistry.includes(c));

  if (faltanEnEnum.length === 0 && faltanEnRegistry.length === 0) {
    console.log(`reglas:verificar — OK, ${enEnum.length} claves coinciden.`);
    return 0;
  }

  console.error('reglas:verificar — el enum regla_clave y el registry NO coinciden.\n');
  if (faltanEnEnum.length) {
    console.error(`  Estan en el registry y faltan en el enum: ${faltanEnEnum.join(', ')}`);
    console.error('  -> agregalas con una migracion: alter type public.regla_clave add value \'...\';\n');
  }
  if (faltanEnRegistry.length) {
    console.error(`  Estan en el enum y faltan en el registry: ${faltanEnRegistry.join(', ')}`);
    console.error('  -> si la regla se elimino, el enum igual conserva el valor para no romper');
    console.error('     el historial de `hallazgos`. Agregala al registry como deshabilitada.\n');
  }
  return 1;
}

process.exit(main());
