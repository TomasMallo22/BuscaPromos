/**
 * Verifica que cada fixture siga siendo valido:
 *   * los de `red/` (capturas reales) contra su `sha256` del manifest;
 *   * los de `casos/` (series sinteticas) contra su forma esperada;
 *   * y que NINGUNO tenga un token adentro.
 *
 * El punto no es la validacion por si misma: es que cuando una API cambie, este chequeo falle
 * en el Pull Request y diga que campo se movio, en vez de que la corrida de produccion empiece
 * a devolver cero productos en silencio. Ver docs/09-fixtures-y-probe.md.
 *
 * El chequeo de secretos es el ultimo cinturon: la redaccion ya corrio en el workflow `probe`,
 * pero el repo es publico y el costo de un token filtrado no es simetrico.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURES = resolve(raiz, 'fixtures');

/** Patrones que no pueden aparecer en un fixture commiteado. */
const SECRETOS: ReadonlyArray<readonly [string, RegExp]> = [
  ['JWT', /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\./],
  ['Bearer', /\bBearer\s+[A-Za-z0-9._-]{16,}/i],
  ['x-guest-api-key', /x-guest-api-key["'\s:]+[A-Za-z0-9._-]{16,}/i],
  ['access_token', /"access_token"\s*:\s*"[^"]{16,}"/],
  ['deviceid', /"deviceid"\s*:\s*"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"/i],
];

let errores = 0;
const fallar = (msg: string): void => {
  console.error(`  MAL ${msg}`);
  errores += 1;
};

function revisarSecretos(etiqueta: string, texto: string): void {
  for (const [nombre, patron] of SECRETOS) {
    if (patron.test(texto)) {
      fallar(`${etiqueta}: parece contener un secreto (${nombre}). No commitees esto.`);
    }
  }
}

function verificarRed(proveedor: string): void {
  const manifestPath = join(FIXTURES, proveedor, 'manifest.json');
  if (!existsSync(manifestPath)) return;
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
    capturas?: Array<{ clave: string; archivo: string; sha256?: string; sintetico?: boolean }>;
  };
  const capturas = manifest.capturas ?? [];
  if (capturas.length === 0) {
    console.log(`  (${proveedor}) sin capturas reales todavia`);
    return;
  }
  for (const c of capturas) {
    const ruta = join(FIXTURES, proveedor, c.archivo);
    if (!existsSync(ruta)) {
      fallar(`${proveedor}/${c.archivo}: el manifest lo lista pero el archivo no esta`);
      continue;
    }
    const contenido = readFileSync(ruta, 'utf8');
    revisarSecretos(`${proveedor}/${c.archivo}`, contenido);
    try {
      JSON.parse(contenido);
    } catch {
      fallar(`${proveedor}/${c.archivo}: no es JSON valido`);
      continue;
    }
    if (c.sintetico) {
      console.log(`  OK  ${c.clave} (sintetico: prueba nuestra idea de la API, no la API)`);
      continue;
    }
    if (!c.sha256) {
      fallar(`${proveedor}/${c.archivo}: falta sha256 en el manifest`);
      continue;
    }
    const hash = createHash('sha256').update(contenido).digest('hex');
    if (hash !== c.sha256) {
      fallar(
        `${proveedor}/${c.archivo}: el sha256 no coincide.\n` +
          `       manifest: ${c.sha256}\n       archivo:  ${hash}\n` +
          '       Si cambiaste el fixture a mano, corré `npm run fixtures:promover`.',
      );
      continue;
    }
    console.log(`  OK  ${c.clave}`);
  }
}

/** Los casos sinteticos del motor: ver fixtures/rappi/casos/README.md. */
function verificarCasos(proveedor: string): void {
  const dir = join(FIXTURES, proveedor, 'casos');
  if (!existsSync(dir)) return;
  for (const nombre of readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
    const ruta = join(dir, nombre);
    const texto = readFileSync(ruta, 'utf8');
    revisarSecretos(`${proveedor}/casos/${nombre}`, texto);
    let caso: Record<string, unknown>;
    try {
      caso = JSON.parse(texto) as Record<string, unknown>;
    } catch {
      fallar(`casos/${nombre}: no es JSON valido`);
      continue;
    }
    for (const campo of ['nombre', 'descripcion', 'esperado']) {
      if (!(campo in caso)) fallar(`casos/${nombre}: falta el campo "${campo}"`);
    }
    // Un caso describe una serie de precios (`filas`) o un sub-pasillo (`subPasillo`).
    const esSerie = 'filas' in caso;
    const esPasillo = 'subPasillo' in caso;
    if (!esSerie && !esPasillo) {
      fallar(`casos/${nombre}: tiene que tener "filas" o "subPasillo"`);
      continue;
    }
    if (esSerie) {
      const filas = caso['filas'] as Array<Record<string, unknown>>;
      if (!Array.isArray(filas) || filas.length === 0) {
        fallar(`casos/${nombre}: "filas" vacio`);
        continue;
      }
      for (const [i, f] of filas.entries()) {
        for (const campo of ['diasAtras', 'precio', 'promoExcluida', 'enStock']) {
          if (!(campo in f)) fallar(`casos/${nombre}: fila ${i} sin "${campo}"`);
        }
      }
      // Cronologico: diasAtras tiene que ir de mayor a menor (la ultima fila es el estado
      // actual). Si no, `estadoOferta` recorre el historial al reves y da cualquier cosa.
      const dias = filas.map((f) => Number(f['diasAtras']));
      for (let i = 1; i < dias.length; i += 1) {
        if (dias[i]! >= dias[i - 1]!) {
          fallar(`casos/${nombre}: las filas no estan en orden cronologico (fila ${i})`);
          break;
        }
      }
    }
    console.log(`  OK  casos/${nombre}`);
  }
}

function main(): number {
  if (!existsSync(FIXTURES)) {
    console.log('fixtures:verificar — no hay carpeta fixtures/. Nada que verificar.');
    return 0;
  }
  const proveedores = readdirSync(FIXTURES, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  console.log('fixtures:verificar');
  for (const p of proveedores) {
    verificarRed(p);
    verificarCasos(p);
  }

  if (errores > 0) {
    console.error(`\nfixtures:verificar — ${errores} problema(s).`);
    return 1;
  }
  console.log('\nfixtures:verificar — OK.');
  return 0;
}

process.exit(main());
