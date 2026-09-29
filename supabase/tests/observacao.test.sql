-- Testes da base de observação. Qualquer falha interrompe (ON_ERROR_STOP).
insert into powerfarm_observacao.agentes (maquina, entidade, segredo_sha256) values
  ('lab-256', 'powerfarm.host-runner.lab-256', encode(extensions.digest('segredo-256', 'sha256'), 'hex')),
  ('lab-8gb', 'powerfarm.host-runner.lab-8gb', encode(extensions.digest('segredo-8gb', 'sha256'), 'hex'));
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'diretor@example.com'),
  ('00000000-0000-0000-0000-000000000002', 'estranho@example.com');
insert into powerfarm_observacao.operadores (user_id, entidade) values
  ('00000000-0000-0000-0000-000000000001', 'powerfarm.person.director');

set role anon;

-- 1. senha errada ou de outra máquina é barrada
do $$ begin
  perform public.pf_agente_sinais('lab-256', 'segredo-8gb', '[]'::jsonb);
  raise exception 'FALHOU: senha de outra máquina foi aceita';
exception when sqlstate '28000' then null; end $$;

-- 2. sinais válidos entram; o estado atual guarda o mais novo
do $$ declare n int; begin
  n := public.pf_agente_sinais('lab-256', 'segredo-256', '[
    {"lugar":"labs","alvo":"lab-256","aspecto":"disco","estado":"ok","valor":{"livre_gb":30},"observado_em":"2026-09-26T10:00:00Z"},
    {"lugar":"labs","alvo":"lab-256","aspecto":"disco","estado":"olhar","valor":{"livre_gb":4},"observado_em":"2026-09-26T10:01:00Z"}
  ]'::jsonb);
  if n <> 2 then raise exception 'FALHOU: esperava 2 sinais no histórico, veio %', n; end if;
end $$;
-- sinal mais velho não sobrescreve o atual
do $$ begin
  perform public.pf_agente_sinais('lab-256', 'segredo-256',
    '[{"lugar":"labs","alvo":"lab-256","aspecto":"disco","estado":"ok","observado_em":"2026-09-26T09:00:00Z"}]'::jsonb);
end $$;

-- 3. dado inválido não entra nada (a chamada inteira falha)
do $$ begin
  perform public.pf_agente_sinais('lab-256', 'segredo-256',
    '[{"lugar":"labs","alvo":"x","aspecto":"ok","estado":"ok","observado_em":"2026-09-26T10:00:00Z"},
      {"lugar":"lugar-que-nao-existe","alvo":"x","aspecto":"a","estado":"ok","observado_em":"2026-09-26T10:00:00Z"}]'::jsonb);
  raise exception 'FALHOU: lugar inválido foi aceito';
exception when check_violation then null; end $$;
-- sinal do futuro é barrado
do $$ begin
  perform public.pf_agente_sinais('lab-256', 'segredo-256',
    format('[{"lugar":"labs","alvo":"x","aspecto":"a","estado":"ok","observado_em":"%s"}]', now() + interval '1 hour')::jsonb);
  raise exception 'FALHOU: sinal do futuro foi aceito';
exception when check_violation then null; end $$;

-- 4. inventário: id fora do formato powerfarm.* é barrado; válido entra
do $$ begin
  perform public.pf_agente_inventario('lab-256', 'segredo-256', '[{"id":"Serviço Solto"}]'::jsonb, now());
  raise exception 'FALHOU: id inválido no inventário foi aceito';
exception when sqlstate '22023' then null; end $$;
do $$ begin
  perform public.pf_agente_inventario('lab-256', 'segredo-256',
    '[{"id":"powerfarm.servico.lab-256.algo","tipo":"service","nome":"algo"}]'::jsonb, now());
end $$;

-- 5. eventos repetidos não duplicam
do $$ declare a int; b int; begin
  a := public.pf_agente_eventos('lab-256', 'segredo-256',
    '[{"id":"evt_01KYJBZA88B4M9XN3RTC5FDGHJ","sessao":"wrun_A","tipo":"message.completed","dados":{"message":"oi"},"emitido_em":"2026-09-26T10:00:00Z"}]'::jsonb);
  b := public.pf_agente_eventos('lab-256', 'segredo-256',
    '[{"id":"evt_01KYJBZA88B4M9XN3RTC5FDGHJ","sessao":"wrun_A","tipo":"message.completed","dados":{"message":"oi"},"emitido_em":"2026-09-26T10:00:00Z"}]'::jsonb);
  if a <> 1 or b <> 0 then raise exception 'FALHOU: evento duplicou (%, %)', a, b; end if;
end $$;

-- 6. ninguém lê as tabelas direto
do $$ begin
  perform 1 from powerfarm_observacao.sinais_atuais;
  raise exception 'FALHOU: anon leu a tabela direto';
exception when insufficient_privilege then null; end $$;

-- 7. anônimo não tem nem a permissão de chamar a leitura do Places (porta fechada, não só recusa lá dentro)
reset role;
do $$ begin
  if has_function_privilege('anon', 'public.pf_places_estado()', 'execute')
     or has_function_privilege('anon', 'public.pf_places_eventos(text, text, integer)', 'execute') then
    raise exception 'FALHOU: anon pode executar as leituras do Places';
  end if;
end $$;
set role anon;

reset role;
set role authenticated;

-- 8. logado mas não operador: sem acesso
do $$ begin perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', false); end $$;
do $$ begin
  perform public.pf_places_estado();
  raise exception 'FALHOU: quem não é operador leu o estado';
exception when insufficient_privilege then null; end $$;

-- 9. operador lê tudo, com o estado atual certo
do $$ begin perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false); end $$;
do $$ declare e jsonb; disco jsonb; begin
  e := public.pf_places_estado();
  if jsonb_array_length(e -> 'registry') <> 4 then raise exception 'FALHOU: registry veio com % itens', jsonb_array_length(e -> 'registry'); end if;
  select s into disco from jsonb_array_elements(e -> 'sinais') s where s ->> 'aspecto' = 'disco';
  if disco ->> 'estado' <> 'olhar' then raise exception 'FALHOU: estado atual do disco deveria ser o mais novo (olhar), veio %', disco ->> 'estado'; end if;
  if jsonb_array_length(e -> 'inventarios') <> 1 then raise exception 'FALHOU: esperava 1 inventário'; end if;
  if jsonb_array_length(public.pf_places_eventos('lab-256')) <> 1 then raise exception 'FALHOU: esperava 1 evento'; end if;
end $$;

-- 10. o agente lê o Registry (sem os aposentados)
reset role;
set role anon;
do $$ declare r jsonb; begin
  r := public.pf_agente_registry('lab-8gb', 'segredo-8gb');
  if r @> '[{"id":"powerfarm.search"}]' then raise exception 'FALHOU: aposentado apareceu para o agente'; end if;
  if not r @> '[{"id":"powerfarm.antenna"}]' then raise exception 'FALHOU: Antenna deveria aparecer'; end if;
end $$;
reset role;

-- 11. quem está logado não usa as funções de escrita dos agentes
do $$ begin
  if has_function_privilege('authenticated', 'public.pf_agente_sinais(text, text, jsonb)', 'execute') then
    raise exception 'FALHOU: authenticated pode escrever como agente';
  end if;
end $$;

select 'banco: todos os testes passaram' as resultado;
