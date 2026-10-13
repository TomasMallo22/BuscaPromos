import { CATEGORIAS } from '@buscapromos/core';
import Link from 'next/link';

/**
 * Elegir que mirar, no limitar que llega (spec 003): todas las ofertas vienen, y el usuario
 * filtra por categoria o busca por nombre. Sin JavaScript: chips que son links y un formulario
 * GET, asi el filtro queda en la URL y se puede volver atras.
 */
export function FiltrosFeed({ categoria, texto }: { categoria: string | null; texto: string | null }) {
  const url = (cat: string | null) => {
    const p = new URLSearchParams();
    if (cat) p.set('cat', cat);
    if (texto) p.set('q', texto);
    const qs = p.toString();
    return qs ? `/feed?${qs}` : '/feed';
  };
  const chip = (activo: boolean) =>
    `flex h-9 shrink-0 items-center rounded-full border px-3 text-sm whitespace-nowrap ${
      activo ? 'border-acento bg-acento text-acento-texto' : 'border-borde bg-superficie text-texto'
    }`;

  return (
    <div className="space-y-3">
      <form action="/feed" method="get" className="flex gap-2" role="search">
        {categoria && <input type="hidden" name="cat" value={categoria} />}
        <input
          name="q"
          defaultValue={texto ?? ''}
          placeholder="Buscar: yogur, yerba, detergente…"
          aria-label="Buscar por nombre"
          className="block h-11 w-full rounded-lg border border-borde bg-superficie px-3 text-base outline-none focus:border-acento focus:ring-2 focus:ring-acento/30"
        />
        <button type="submit" className="h-11 shrink-0 rounded-lg bg-acento px-4 font-medium text-acento-texto">
          Buscar
        </button>
      </form>
      <nav aria-label="Categorías" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <Link href={url(null)} className={chip(!categoria)} aria-current={!categoria ? 'page' : undefined}>
          Todas
        </Link>
        {CATEGORIAS.map((c) => (
          <Link key={c.clave} href={url(c.clave)} className={chip(categoria === c.clave)} aria-current={categoria === c.clave ? 'page' : undefined}>
            {c.nombre}
          </Link>
        ))}
      </nav>
      {texto && (
        <p className="text-sm text-texto-suave">
          Resultados para “{texto}” ·{' '}
          <Link href={categoria ? `/feed?cat=${categoria}` : '/feed'} className="font-medium text-acento underline underline-offset-2">
            sacar la búsqueda
          </Link>
        </p>
      )}
    </div>
  );
}
