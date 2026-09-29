-- Testes do Registry com três tabelas (entidades, objetos, contratos) e da fundação.
-- Roda depois de observacao.test.sql: usa os agentes e o operador criados lá. Qualquer falha interrompe.
reset role;

-- 1. no Registry só existem as três tabelas
do $$ declare t text; begin
  select string_agg(table_name, ',' order by table_name) into t
  from information_schema.tables where table_schema = 'powerfarm_registry';
  if t is distinct from 'contratos,entidades,objetos' then raise exception 'FALHOU: o Registry tem %', t; end if;
end $$;

-- 2. a cópia: as entidades vieram todas; o artifact virou um objeto com 2 versões
do $$ begin
  if (select count(*) from powerfarm_registry.entidades) <> 4 then raise exception 'FALHOU: entidades não vieram todas'; end if;
  if (select retirada_em from powerfarm_registry.entidades where id = 'powerfarm.search') is null then
    raise exception 'FALHOU: a aposentadoria de powerfarm.search se perdeu';
  end if;
  if (select count(*) from powerfarm_registry.objetos where id = 'powerfarm.artifact.legacy-airtable-registry-export') <> 2 then
    raise exception 'FALHOU: o artifact não virou objeto com 2 versões';
  end if;
  if (select onde from powerfarm_registry.objetos where versao = 2)
     <> 'powerfarm-minivault/migration/airtable/2026-09-24/airtable-full-export.ndjson' then
    raise exception 'FALHOU: objeto perdeu onde está';
  end if;
end $$;

-- 3. o Minivault vê o mesmo que via antes
do $$ declare l jsonb; g jsonb; begin
  l := public.minivault_list();
  if jsonb_array_length(l) <> 1 then raise exception 'FALHOU: minivault_list com % itens', jsonb_array_length(l); end if;
  if l -> 0 ->> 'kind' <> 'migration-evidence' then raise exception 'FALHOU: kind mudou'; end if;
  if l -> 0 -> 'current_version' ->> 'version' <> '2026-09-24-pre-retirement' then raise exception 'FALHOU: versão atual mudou'; end if;
  if l -> 0 -> 'current_version' -> 'storage' ->> 'object' <> 'migration/airtable/2026-09-24/airtable-full-export.ndjson' then
    raise exception 'FALHOU: storage mudou';
  end if;
  if (l -> 0 -> 'current_version' ->> 'size_bytes')::bigint <> 537688 then raise exception 'FALHOU: tamanho mudou'; end if;
  g := public.minivault_get('powerfarm.artifact.legacy-airtable-registry-export');
  if jsonb_array_length(g -> 'versions') <> 2 then raise exception 'FALHOU: minivault_get sem as 2 versões'; end if;
  if g -> 'versions' -> 0 ->> 'status' <> 'recognized' or g -> 'versions' -> 1 ->> 'status' <> 'superseded' then
    raise exception 'FALHOU: situação das versões mudou: %', g -> 'versions';
  end if;
  if public.minivault_get('powerfarm.nao-existe') is not null then raise exception 'FALHOU: objeto inexistente apareceu'; end if;
end $$;

-- 4. regras que o banco cobra
do $$ begin
  delete from powerfarm_registry.entidades where id = 'powerfarm.antenna';
  raise exception 'FALHOU: apagou uma entidade';
exception when sqlstate '42501' then null; end $$;
do $$ begin
  update powerfarm_registry.objetos set nome = 'outro nome' where versao = 1;
  raise exception 'FALHOU: uma versão de objeto mudou';
exception when sqlstate '42501' then null; end $$;
do $$ begin
  insert into powerfarm_registry.contratos (id, versao, nome, partes) values ('powerfarm.contrato.teste', 1, 'teste', '{powerfarm.ninguem}');
  raise exception 'FALHOU: contrato com parte que não existe';
exception when sqlstate '23503' then null; end $$;
do $$ begin
  if has_function_privilege('authenticated', 'public.powerfarm_fundar(text, text, jsonb, text)', 'execute') then
    raise exception 'FALHOU: authenticated pode fundar';
  end if;
end $$;

-- 5. a fundação
set role anon;
do $$ begin
  perform public.powerfarm_fundar('lab-256', 'errada', '{"versao":1,"entidades":[],"objetos":[],"contratos":[]}', 'sha256:' || repeat('0', 64));
  raise exception 'FALHOU: fundou com senha errada';
exception when sqlstate '28000' then null; end $$;

do $$
declare
  cs constant jsonb := '{
    "versao": 1,
    "entidades": [
      {"id": "powerfarm", "tipo": "company", "nome": "Powerfarm"},
      {"id": "powerfarm.person.director", "tipo": "person", "nome": "Director"},
      {"id": "powerfarm.lab-8gb", "tipo": "machine", "nome": "LAB 8GB"},
      {"id": "powerfarm.host-runner.lab-8gb", "tipo": "service", "nome": "Host Runner — LAB 8GB"}
    ],
    "objetos": [{"id": "powerfarm.artifact.legacy-airtable-registry-export", "versao": 2}],
    "contratos": [
      {"id": "powerfarm.contrato.fundacao", "versao": 1, "nome": "Fundação da Powerfarm",
       "partes": ["powerfarm.person.director", "powerfarm"], "objetos": ["powerfarm.objeto.contrato-social"]},
      {"id": "powerfarm.contrato.lab-8gb", "versao": 1, "nome": "LAB 8GB serve a Powerfarm",
       "partes": ["powerfarm", "powerfarm.lab-8gb", "powerfarm.host-runner.lab-8gb"], "termos": {"papel": "principal"}}
    ]
  }';
  h constant text := 'sha256:' || repeat('a', 64);
  r jsonb;
  reg jsonb;
begin
  r := public.powerfarm_fundar('lab-8gb', 'segredo-8gb', cs, h);
  if (r ->> 'entidades')::int <> 4 then raise exception 'FALHOU: entidades ativas = %', r ->> 'entidades'; end if;
  if (r ->> 'objetos')::int <> 2 then raise exception 'FALHOU: objetos ativos = %', r ->> 'objetos'; end if;
  if (r ->> 'contratos')::int <> 2 then raise exception 'FALHOU: contratos ativos = %', r ->> 'contratos'; end if;

  -- o agente passa a ver só o que o contrato social diz
  reg := public.pf_agente_registry('lab-8gb', 'segredo-8gb');
  if jsonb_array_length(reg) <> 4 then raise exception 'FALHOU: o agente vê % entidades', jsonb_array_length(reg); end if;
  if reg @> '[{"id":"powerfarm.antenna"}]' then raise exception 'FALHOU: Antenna ficou fora do contrato social e ainda aparece'; end if;
  if not reg @> '[{"id":"powerfarm","kind":"company"}]' then raise exception 'FALHOU: a empresa não apareceu'; end if;

  -- fundar de novo com o mesmo contrato social não muda nada
  r := public.powerfarm_fundar('lab-8gb', 'segredo-8gb', cs, h);
  if (r ->> 'mudancas')::int <> 0 then raise exception 'FALHOU: fundar de novo mudou % coisas', r ->> 'mudancas'; end if;

  -- a mesma versão do contrato social com outro conteúdo é barrada
  begin
    perform public.powerfarm_fundar('lab-8gb', 'segredo-8gb', cs, 'sha256:' || repeat('b', 64));
    raise exception 'FALHOU: o contrato social mudou sem subir a versão';
  exception when sqlstate '23505' then null;
  end;
end $$;
reset role;

-- 6. o que saiu do contrato social foi aposentado, não apagado
do $$ begin
  if (select retirada_em from powerfarm_registry.entidades where id = 'powerfarm.antenna') is null then
    raise exception 'FALHOU: Antenna deveria estar aposentada';
  end if;
  if (select retirado_em from powerfarm_registry.objetos where id = 'powerfarm.artifact.legacy-airtable-registry-export' and versao = 1) is null then
    raise exception 'FALHOU: a versão 1 fora do contrato social deveria estar aposentada';
  end if;
  if (select count(*) from powerfarm_registry.entidades) <> 6 then raise exception 'FALHOU: alguma entidade sumiu'; end if;
  -- o Minivault vê o objeto mantido (versão 2) e o próprio contrato social
  if jsonb_array_length(public.minivault_list()) <> 2 then raise exception 'FALHOU: o Minivault deveria ver 2 objetos'; end if;
  if jsonb_array_length(public.minivault_get('powerfarm.artifact.legacy-airtable-registry-export') -> 'versions') <> 2 then
    raise exception 'FALHOU: a versão aposentada sumiu do histórico';
  end if;
end $$;

-- 7. nome é powerfarm.*: pf.* não entra; quem ainda usa o nome antigo é atendido
do $$ begin
  insert into powerfarm_registry.entidades (id, tipo, nome) values ('pf.lab-9', 'machine', 'LAB 9');
  raise exception 'FALHOU: entrou uma entidade com nome pf.*';
exception when check_violation then null; end $$;
do $$ begin
  if public.minivault_get('pf.artifact.legacy-airtable-registry-export') ->> 'id' is distinct from 'powerfarm.artifact.legacy-airtable-registry-export' then
    raise exception 'FALHOU: minivault_get pelo nome antigo não achou o objeto';
  end if;
  if exists (select 1 from powerfarm_observacao.agentes where entidade !~ '^powerfarm\.') then
    raise exception 'FALHOU: agente com entidade fora de powerfarm.*';
  end if;
end $$;
set role anon;
do $$ begin
  perform public.pf_agente_inventario('lab-256', 'segredo-256',
    '[{"id":"pf.lab-256","tipo":"machine","nome":"lab-256"},{"id":"powerfarm.mcp.x","tipo":"mcp","nome":"x"}]'::jsonb, now());
end $$;
reset role;
do $$ declare ids jsonb; begin
  select jsonb_agg(e ->> 'id') into ids
  from (select itens from powerfarm_observacao.inventarios order by id desc limit 1) i, jsonb_array_elements(i.itens) e;
  if ids is distinct from '["powerfarm.lab-256", "powerfarm.mcp.x"]'::jsonb then
    raise exception 'FALHOU: o inventário não converteu pf.* para powerfarm.*: %', ids;
  end if;
end $$;

select 'registry: todos os testes passaram' as resultado;
