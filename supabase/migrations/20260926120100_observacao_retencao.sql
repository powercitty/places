-- Powerfarm · observação: limpeza automática do que é velho (roda dentro do Supabase, com pg_cron).
-- Sinais: 14 dias de histórico (o estado atual nunca é apagado).
-- Inventários: 14 dias, mas o último de cada máquina sempre fica.
-- Eventos dos agentes: 180 dias.

create extension if not exists pg_cron;

select cron.schedule(
  'pf-observacao-limpa-sinais',
  '17 3 * * *',
  $$delete from powerfarm_observacao.sinais_historico where observado_em < now() - interval '14 days'$$
);

select cron.schedule(
  'pf-observacao-limpa-inventarios',
  '27 3 * * *',
  $$delete from powerfarm_observacao.inventarios i
    where i.observado_em < now() - interval '14 days'
      and i.id <> (select u.id from powerfarm_observacao.inventarios u
                   where u.maquina = i.maquina order by u.observado_em desc limit 1)$$
);

select cron.schedule(
  'pf-observacao-limpa-eventos',
  '37 3 * * *',
  $$delete from powerfarm_observacao.eventos where emitido_em < now() - interval '180 days'$$
);
