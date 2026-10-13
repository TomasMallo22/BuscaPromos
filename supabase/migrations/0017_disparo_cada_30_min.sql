-- 0017 — El buscador cada 30 minutos de verdad (spec 003, E10).
--
-- El cron de GitHub Actions corrio 4-5 veces por dia en vez de 48 (tabla `corridas`, del 08 al
-- 13/10: huecos de hasta 9 horas). GitHub atrasa y saltea los `schedule`. Supabase tiene un cron
-- de verdad (pg_cron) y puede hacer HTTP (pg_net): cada 30 minutos dispara `corrida.yml` con
-- `workflow_dispatch`, igual que la web al guardar una direccion. El cron de GitHub queda de
-- respaldo; la `concurrency` del workflow y `tocaRecorrer` evitan el trabajo doble.
--
-- El token NO esta en esta migracion (el repo es publico): se lee de Vault, con el nombre
-- `github_token_corrida`. Lo carga el dueño en el panel (Project Settings -> Vault). Sin el
-- secret, la funcion no hace nada.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

create or replace function private.disparar_corrida()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  token text;
begin
  select decrypted_secret into token from vault.decrypted_secrets where name = 'github_token_corrida';
  if token is null or token = '' then
    return;
  end if;
  perform net.http_post(
    url := 'https://api.github.com/repos/TomasMallo22/BuscaPromos/actions/workflows/corrida.yml/dispatches',
    body := '{"ref": "main"}'::jsonb,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || token,
      'Accept', 'application/vnd.github+json',
      'X-GitHub-Api-Version', '2022-11-28',
      'User-Agent', 'buscapromos-supabase-cron',
      'Content-Type', 'application/json'
    )
  );
end;
$$;

revoke all on function private.disparar_corrida() from public, anon, authenticated;

-- Minutos 7 y 37: lejos de :00 y :30, donde todo el mundo programa cosas.
select cron.schedule('disparar-corrida', '7,37 * * * *', 'select private.disparar_corrida()');
