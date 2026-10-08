'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** Mientras el buscador trabaja, el feed se vuelve a pedir solo. Sin esto, "buscando…" es para siempre. */
export function AutoRefresco({ cadaSegundos }: { cadaSegundos: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), cadaSegundos * 1000);
    return () => clearInterval(t);
  }, [router, cadaSegundos]);
  return null;
}
