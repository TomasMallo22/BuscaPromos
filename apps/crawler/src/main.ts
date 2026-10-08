/**
 * `npm run corrida`: la corrida de produccion. Corre en Actions (`.github/workflows/corrida.yml`),
 * con los secrets como variables de entorno. Ver docs/07-operacion.md.
 */
import { crearClienteServicio } from '@buscapromos/db/servicio';
import { ClienteRed, crearRappi } from '@buscapromos/providers';
import { correr } from './corrida.js';

function requerida(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) {
    console.error(`Falta la variable de entorno ${nombre}. Ver docs/12-trabajar-en-local.md.`);
    process.exit(2);
  }
  return valor;
}

const appVersion = process.env['RAPPI_APP_VERSION'] || 'web_v1.223.2';
const proveedor = crearRappi({ deviceId: requerida('RAPPI_DEVICE_ID'), appVersion });

const { errores } = await correr({
  db: crearClienteServicio(requerida('SUPABASE_URL'), requerida('SUPABASE_SERVICE_ROLE_KEY')),
  http: new ClienteRed({ msEntreRequests: proveedor.politicas.msEntreRequests }),
  proveedor,
  appVersion,
  commitSha: process.env['GITHUB_SHA'] ?? null,
  log: (linea) => console.log(linea),
});

process.exit(errores > 0 ? 1 : 0);
