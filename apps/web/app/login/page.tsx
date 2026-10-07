import { MENSAJE_LINK_VENCIDO } from '@/lib/auth';
import { FormularioLogin } from './formulario';

export default async function PaginaLogin({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">BuscaPromos</h1>
      <p className="mt-2 mb-8 text-texto-suave">
        Te avisa cuando algo está de verdad más barato que de costumbre. No le cree al precio tachado.
      </p>
      <FormularioLogin errorInicial={error === 'link' ? MENSAJE_LINK_VENCIDO : null} />
    </main>
  );
}
