import type { NextConfig } from 'next';

const config: NextConfig = {
  // Los paquetes del monorepo se publican como TypeScript fuente (`main: ./src/index.ts`).
  transpilePackages: ['@buscapromos/core', '@buscapromos/db', '@buscapromos/providers'],
  // El lint corre desde la raiz (`npm run lint`), con las reglas propias del repo.
  eslint: { ignoreDuringBuilds: true },
  webpack: (webpackConfig: { resolve: { extensionAlias?: Record<string, string[]> } }) => {
    // Los paquetes importan con extension `.js` (ESM estricto); en disco son `.ts`.
    webpackConfig.resolve.extensionAlias = { '.js': ['.ts', '.tsx', '.js'] };
    return webpackConfig;
  },
};

export default config;
