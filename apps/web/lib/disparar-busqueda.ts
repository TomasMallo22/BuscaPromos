/**
 * Despierta al buscador sin esperar al cron: dispara `corrida.yml` con `workflow_dispatch`.
 * Solo del lado del servidor: el token es secreto, por eso NO lleva `NEXT_PUBLIC_`.
 *
 * El token es de un solo permiso (Actions: read and write sobre este repo). Si falta o GitHub
 * no responde, no pasa nada grave: la direccion ya esta guardada y la toma el cron en la
 * proxima media hora (E24 de la spec 001). Guardar nunca falla por esto.
 */
export async function dispararBusqueda(): Promise<boolean> {
  const token = process.env.GITHUB_TOKEN_CORRIDA;
  if (!token) return false;
  const repo = process.env.GITHUB_REPO ?? 'TomasMallo22/BuscaPromos';
  try {
    const r = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/corrida.yml/dispatches`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({ ref: 'main' }),
      signal: AbortSignal.timeout(8000),
    });
    return r.status === 204;
  } catch {
    return false;
  }
}
