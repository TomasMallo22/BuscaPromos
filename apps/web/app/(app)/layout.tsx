import Link from 'next/link';
import type { ReactNode } from 'react';

/** El marco de las pantallas con sesion. El middleware ya dejo afuera a quien no la tiene. */
export default function LayoutApp({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-borde bg-fondo/95 px-4 backdrop-blur">
        <Link href="/feed" className="flex h-12 items-center font-semibold tracking-tight">
          BuscaPromos
        </Link>
        <nav>
          <Link href="/ajustes" className="flex h-12 items-center px-2 text-sm text-texto-suave">
            Ajustes
          </Link>
        </nav>
      </header>
      <main className="flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
