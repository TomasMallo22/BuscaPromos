import { defineWorkspace } from 'vitest/config';

// Un proyecto por nivel de verificacion (ver docs/09-fixtures-y-probe.md):
//   core      — deteccion pura, reloj inyectado, sin red ni DB
//   fixtures  — parsing y crawl contra fixtures/<proveedor>/red/
//   db        — migraciones y RLS contra `supabase start` (docker local)
//   web       — la logica pura de apps/web (auth, redirects). Las pantallas no se testean aca.
export default defineWorkspace([
  { test: { name: 'core', include: ['packages/core/**/*.test.ts'] } },
  { test: { name: 'fixtures', include: ['packages/providers/**/*.test.ts'] } },
  { test: { name: 'db', include: ['packages/db/**/*.test.ts'] } },
  { test: { name: 'web', include: ['apps/web/**/*.test.ts'] } },
]);
