import Link from 'next/link';
import { FormularioDireccion } from './formulario';

export default function PaginaNuevaDireccion() {
  return (
    <div className="space-y-5">
      <div>
        <Link href="/direcciones" className="text-sm text-texto-suave">
          ← Direcciones
        </Link>
        <h1 className="mt-2 text-lg font-semibold">Nueva dirección</h1>
        <p className="mt-1 text-texto-suave">Buscamos ofertas en el Rappi Turbo que te llega ahí.</p>
      </div>
      <FormularioDireccion />
    </div>
  );
}
