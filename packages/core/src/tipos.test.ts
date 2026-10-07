/**
 * Verifica que los tipos del dominio no se desincronicen de los enums de Postgres.
 *
 * No es un test ceremonial: un valor agregado al enum y olvidado en el tipo (o al reves) produce
 * un `never` o un valor que la base rechaza en runtime, y los dos se descubren tarde. El SQL es
 * la fuente de verdad porque es lo que la base realmente acepta.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ORIGENES_COMPARABLES, habilitaComparacion, type OrigenClave } from './tipos.js';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const sql = readFileSync(resolve(raiz, 'supabase/migrations/0001_enums_y_schemas.sql'), 'utf8');
const aca = dirname(fileURLToPath(import.meta.url));
// ReglaClave vive en reglas/tipos.ts: ver el comentario en tipos.ts.
const tiposTs =
  readFileSync(resolve(aca, 'tipos.ts'), 'utf8') +
  readFileSync(resolve(aca, 'reglas/tipos.ts'), 'utf8');

/** Los valores de `create type public.<nombre> as enum (...)`, ignorando comentarios. */
function valoresDelEnum(nombre: string): string[] {
  const re = new RegExp(`create\\s+type\\s+public\\.${nombre}\\s+as\\s+enum\\s*\\(([\\s\\S]*?)\\)\\s*;`, 'i');
  const bloque = re.exec(sql);
  if (!bloque?.[1]) throw new Error(`No encontre el enum ${nombre} en la migracion 0001`);
  const sinComentarios = bloque[1].replace(/--[^\n]*/g, '');
  return [...sinComentarios.matchAll(/'([^']+)'/g)].map((m) => m[1]!).sort();
}

/** Los miembros de `export type <Nombre> = 'a' | 'b' | ...`, ignorando comentarios. */
function miembrosDelTipo(nombre: string): string[] {
  const re = new RegExp(`export\\s+type\\s+${nombre}\\s*=([\\s\\S]*?);`, 'm');
  const bloque = re.exec(tiposTs);
  if (!bloque?.[1]) throw new Error(`No encontre el tipo ${nombre} en tipos.ts`);
  return [...bloque[1].matchAll(/'([^']+)'/g)].map((m) => m[1]!).sort();
}

describe('los tipos del dominio reflejan los enums de Postgres', () => {
  const pares: ReadonlyArray<readonly [string, string]> = [
    ['tipo_proveedor', 'TipoProveedor'],
    ['promo_kind', 'PromoKind'],
    ['estado_oferta', 'EstadoOferta'],
    ['regla_clave', 'ReglaClave'],
    ['origen_clave', 'OrigenClave'],
    ['estado_corrida', 'EstadoCorrida'],
    ['tipo_canal', 'TipoCanal'],
  ];

  for (const [enumSql, tipoTs] of pares) {
    it(`${enumSql} === ${tipoTs}`, () => {
      expect(miembrosDelTipo(tipoTs)).toEqual(valoresDelEnum(enumSql));
    });
  }
});

describe('habilitaComparacion — regla de oro 15', () => {
  it('EAN y master de Rappi habilitan comparar entre tiendas', () => {
    expect(habilitaComparacion('ean')).toBe(true);
    expect(habilitaComparacion('rappi_master')).toBe(true);
  });

  it('el match por nombre NO habilita comparar', () => {
    // Juntaria "Yogur Ser Frutilla 190g" con "...190g x4" y produciria la peor clase de falso
    // positivo: convincente. Ver ADR 0006. Si este test se cae, se rompio una regla de oro.
    expect(habilitaComparacion('nombre_marca_presentacion')).toBe(false);
  });

  it('todo origen del enum esta clasificado explicitamente', () => {
    // Un origen nuevo que nadie clasifico cae por default en "no comparable", que es el lado
    // seguro — pero queremos que alguien lo decida a proposito, no por omision.
    const delEnum = valoresDelEnum('origen_clave') as OrigenClave[];
    const noComparables = delEnum.filter((o) => !ORIGENES_COMPARABLES.includes(o));
    expect([...ORIGENES_COMPARABLES, ...noComparables].sort()).toEqual([...delEnum].sort());
  });
});
