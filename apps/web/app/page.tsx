import { redirect } from 'next/navigation';
import { DESTINO_POR_DEFECTO } from '@/lib/auth';

export default function Inicio() {
  redirect(DESTINO_POR_DEFECTO);
}
