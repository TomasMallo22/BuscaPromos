// @ts-check
import tseslint from 'typescript-eslint';

/**
 * Las dos reglas propias del repo (ver CLAUDE.md "Que NO hacer") estan expresadas de forma
 * declarativa con `no-restricted-syntax` y `no-restricted-imports`, en vez de como plugins
 * con reglas custom: menos codigo que mantener y el mensaje de error es igual de claro.
 *
 * El CI repite las dos como `grep` (ver .github/workflows/ci.yml). Es redundante a proposito:
 * las dos cosas que previenen (filtrar la base entera, y duplicar la definicion de una regla)
 * tienen un costo asimetrico, y un `eslint-disable` las desactivaria en silencio.
 */

/** Las claves de regla. Fuera de `packages/core/src/reglas/` no van como string literal. */
const CLAVES_DE_REGLA = [
  'precio_absurdo',
  'caida_vs_historial',
  'descuento_extremo',
  'gran_descuento',
  'vs_otras_tiendas',
  'nuevo_vs_pasillo',
];

export default tseslint.config(
  { ignores: ['**/dist/**', '**/.next/**', '**/node_modules/**', 'probes/**'] },

  ...tseslint.configs.recommended,

  {
    rules: {
      eqeqeq: ['error', 'always'],
      'no-console': 'off', // el crawler y los scripts son CLIs: la salida es la interfaz
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },

  // no-clave-regla-literal — ADR 0007. Una regla se define en un solo lugar: el registry.
  {
    files: ['**/*.ts', '**/*.tsx'],
    ignores: ['packages/core/src/reglas/**', 'scripts/**', 'eslint.config.js', '**/*.test.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...CLAVES_DE_REGLA.map((clave) => ({
          selector: `Literal[value="${clave}"]`,
          message:
            `'${clave}' es una clave de regla y solo se escribe en ` +
            'packages/core/src/reglas/registry.ts. Importala del registry (ADR 0007).',
        })),
      ],
    },
  },

  // no-service-role-en-web — docs/10-seguridad-rls.md. La clave service_role saltea RLS por
  // diseno: si llega al bundle del front, expone la base entera.
  {
    files: ['apps/web/**/*.ts', 'apps/web/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/db/src/servicio*', '@buscapromos/db/servicio*'],
              message:
                'apps/web NO puede importar el cliente service_role: saltea RLS y expondria ' +
                'la base entera. Usa el cliente con la anon key.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/SUPABASE_SERVICE_ROLE_KEY/]',
          message: 'La clave service_role no se referencia desde apps/web. Nunca.',
        },
      ],
    },
  },
);
