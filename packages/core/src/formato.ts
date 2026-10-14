/**
 * Como se escribe un precio y un descuento, para la web y para Telegram (docs/05: formato
 * argentino). En un solo lugar para que un aviso y la pantalla digan exactamente lo mismo.
 */

const ARS = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** `$1.200,50`: punto para miles, coma para decimales. */
export function pesos(n: number): string {
  const conDecimales = Number.isInteger(n)
    ? ARS.format(n)
    : n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `$${conDecimales}`;
}

/** Un ratio `precio / referencia` como "cuanto menos": 0.45 -> "55%". */
export const porcentajeMenos = (ratio: number): string => `${Math.round((1 - ratio) * 100)}%`;
